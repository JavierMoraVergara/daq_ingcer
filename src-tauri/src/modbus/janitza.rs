use crate::modbus::client::ModbusTcpClient;
use std::time::Duration;
use tokio::time::sleep;

/// Janitza UMG509-PRO variable definitions with Modbus register addresses.
/// Each variable occupies 2 consecutive registers forming a float IEEE 754 big-endian.
#[derive(Debug, Clone, Copy)]
pub enum JanitzaVar {
    V1, V2, V3,
    C1, C2, C3,
    P1, P2, P3,
    F,
    E1, E2, E3,
    Fp1, Fp2, Fp3,
    Thd1, Thd2, Thd3,
}

impl JanitzaVar {
    /// Get the starting Modbus register address for this variable
    pub fn registro_inicio(&self) -> u16 {
        match self {
            JanitzaVar::V1 => 19000,
            JanitzaVar::V2 => 19002,
            JanitzaVar::V3 => 19004,
            JanitzaVar::C1 => 19012,
            JanitzaVar::C2 => 19014,
            JanitzaVar::C3 => 19016,
            JanitzaVar::P1 => 19020,
            JanitzaVar::P2 => 19022,
            JanitzaVar::P3 => 19024,
            JanitzaVar::F  => 19050,
            JanitzaVar::E1 => 19054,
            JanitzaVar::E2 => 19056,
            JanitzaVar::E3 => 19058,
            JanitzaVar::Fp1 => 19044,
            JanitzaVar::Fp2 => 19046,
            JanitzaVar::Fp3 => 19048,
            JanitzaVar::Thd1 => 19110,
            JanitzaVar::Thd2 => 19112,
            JanitzaVar::Thd3 => 19114,
        }
    }

    /// Get the measurement unit
    pub fn unidad(&self) -> &'static str {
        match self {
            JanitzaVar::V1 | JanitzaVar::V2 | JanitzaVar::V3 => "V",
            JanitzaVar::C1 | JanitzaVar::C2 | JanitzaVar::C3 => "A",
            JanitzaVar::P1 | JanitzaVar::P2 | JanitzaVar::P3 => "W",
            JanitzaVar::F => "Hz",
            JanitzaVar::E1 | JanitzaVar::E2 | JanitzaVar::E3 => "Wh",
            JanitzaVar::Fp1 | JanitzaVar::Fp2 | JanitzaVar::Fp3 => "",
            JanitzaVar::Thd1 | JanitzaVar::Thd2 | JanitzaVar::Thd3 => "",
        }
    }

    /// Parse from string identifier (as stored in esquemas.json canales_janitzas)
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "v1" => Some(JanitzaVar::V1),
            "v2" => Some(JanitzaVar::V2),
            "v3" => Some(JanitzaVar::V3),
            "c1" => Some(JanitzaVar::C1),
            "c2" => Some(JanitzaVar::C2),
            "c3" => Some(JanitzaVar::C3),
            "p1" => Some(JanitzaVar::P1),
            "p2" => Some(JanitzaVar::P2),
            "p3" => Some(JanitzaVar::P3),
            "f"  => Some(JanitzaVar::F),
            "e1" => Some(JanitzaVar::E1),
            "e2" => Some(JanitzaVar::E2),
            "e3" => Some(JanitzaVar::E3),
            "fp1" => Some(JanitzaVar::Fp1),
            "fp2" => Some(JanitzaVar::Fp2),
            "fp3" => Some(JanitzaVar::Fp3),
            "thd1" => Some(JanitzaVar::Thd1),
            "thd2" => Some(JanitzaVar::Thd2),
            "thd3" => Some(JanitzaVar::Thd3),
            _ => None,
        }
    }
}

/// Convert two uint16 Modbus registers to f32 (IEEE 754 big-endian)
pub fn registros_a_float(high: u16, low: u16) -> f32 {
    let bytes: [u8; 4] = [
        (high >> 8) as u8,
        (high & 0xFF) as u8,
        (low >> 8) as u8,
        (low & 0xFF) as u8,
    ];
    f32::from_be_bytes(bytes)
}

/// Read selected Janitza UMG509-PRO variables with retry logic.
/// Returns Vec<Option<f64>> where None = NULL (instrument did not respond).
pub async fn leer_janitza(
    client: &mut ModbusTcpClient,
    slave_id: u8,
    variables: &[JanitzaVar],
    reintentos: u8,
    timeout_ms: u64,
) -> Vec<Option<f64>> {
    let mut resultados = Vec::with_capacity(variables.len());

    for variable in variables {
        let addr = variable.registro_inicio();
        let mut valor: Option<f64> = None;

        for _intento in 0..=reintentos {
            match client.leer_holding_registers_slave(slave_id, addr, 2, timeout_ms).await {
                Ok(regs) if regs.len() == 2 => {
                    let float_val = registros_a_float(regs[0], regs[1]);
                    valor = Some(float_val as f64);
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
