use crate::modbus::client::ModbusTcpClient;
use std::time::Duration;
use tokio::time::sleep;

/// Metaltex MC62 temperature controller.
///
/// Two channels are exposed:
///   - PV (Process Value): current temperature read by the thermocouple. Register 64.
///   - SV (Set Value): desired temperature setpoint. Register 65 (also SP1 at register 0).
///
/// Values are signed 16-bit integers scaled by the decimal-point parameter DP,
/// read from register 14:
///   - DP = 1 → value is multiplied by 10 (e.g. 292 → 29.2 °C)
///   - DP = 0 → value is direct (e.g. 29 → 29 °C)
///
/// Read: Modbus function 03 (Read Holding Registers).
/// Write SV: Modbus function 06 (Write Single Register) to register 1 (SP1).

const REG_PV: u16 = 64;
/// Registro de lectura del Set Value.
const REG_SV: u16 = 65;
/// Registro de escritura del Set Value (SP1). Confirmado con la captura de
/// QModMaster: la trama Modbus usa "Starting Address: 0000" (función 06).
/// QModMaster muestra "1" en la UI pero envía dirección 0 en el cable.
const REG_SV_WRITE: u16 = 0;

/// Offset fijo que antepone el MC62 a los valores de temperatura.
/// El equipo transmite 20000 + (temperatura × 10).
/// Ej: 20442 → (20442 - 20000) / 10 = 44.2 °C
const OFFSET_MC62: f64 = 20000.0;

/// El display del equipo muestra consistentemente 0.1 °C más que el valor del
/// registro Modbus (equivale a +1 en el raw). Se corrige para que el software
/// coincida con el display: +1 al leer, -1 al escribir.
const CORRECCION_RAW: i32 = 1;

/// Variables available on the Metaltex MC62.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum MetaltexVar {
    Pv,
    Sv,
}

impl MetaltexVar {
    pub fn registro(&self) -> u16 {
        match self {
            MetaltexVar::Pv => REG_PV,
            MetaltexVar::Sv => REG_SV,
        }
    }

    pub fn unidad(&self) -> &'static str {
        "°C"
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "pv" => Some(MetaltexVar::Pv),
            "sv" => Some(MetaltexVar::Sv),
            _ => None,
        }
    }
}

/// Convert a raw register value to temperature in °C.
/// Format confirmed with the real device: raw = 20000 + (temp × 10).
/// Se suma CORRECCION_RAW para igualar la lectura al display del equipo.
fn convertir_raw(raw: u16) -> f64 {
    ((raw as i32 + CORRECCION_RAW) as f64 - OFFSET_MC62) / 10.0
}

/// Read the selected Metaltex MC62 variables (PV / SV) with retry logic.
/// Returns Vec<Option<f64>> where None = NULL (controller did not respond).
pub async fn leer_metaltex(
    client: &mut ModbusTcpClient,
    slave_id: u8,
    variables: &[MetaltexVar],
    reintentos: u8,
    timeout_ms: u64,
) -> Vec<Option<f64>> {
    let mut resultados = Vec::with_capacity(variables.len());

    for variable in variables {
        let addr = variable.registro();
        let mut valor: Option<f64> = None;

        for _intento in 0..=reintentos {
            match client
                .leer_holding_registers_slave(slave_id, addr, 1, timeout_ms)
                .await
            {
                Ok(regs) if !regs.is_empty() => {
                    valor = Some(convertir_raw(regs[0]));
                    break;
                }
                _ => {
                    sleep(Duration::from_millis(100)).await;
                }
            }
        }

        resultados.push(valor);
    }

    resultados
}

/// Write the Set Value (SV) to the Metaltex MC62 at register 1 (SP1).
/// `valor_real` is the temperature in °C (e.g. 60.0). Applies the same formula
/// as the read: raw = (temp × 10) + 20000 (ej: 60 °C → 20600, 100 °C → 21000).
pub async fn escribir_sv(
    client: &mut ModbusTcpClient,
    slave_id: u8,
    valor_real: f64,
    timeout_ms: u64,
) -> Result<(), String> {
    // Mismo formato que la lectura: raw = (temp × 10) + 20000.
    // Se resta CORRECCION_RAW porque el equipo suma 0.1 °C internamente:
    // pedir 80 °C → enviar 20799 → el equipo muestra 80.0.
    let raw = (((valor_real * 10.0) + OFFSET_MC62).round() as i32 - CORRECCION_RAW) as u16;
    let resultado = client
        .escribir_single_register_slave(slave_id, REG_SV_WRITE, raw, timeout_ms)
        .await;

    // El MC62 ejecuta la escritura pero no envía respuesta de confirmación,
    // por lo que un timeout tras enviar la trama es un comportamiento esperado
    // (reproducible también en QModMaster) y se trata como éxito.
    match resultado {
        Ok(()) => Ok(()),
        Err(e) if e.contains("Timeout") => Ok(()),
        Err(e) => Err(e),
    }
}
