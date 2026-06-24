use crate::modbus::client::ModbusTcpClient;
use std::time::Duration;
use tokio::time::sleep;

/// ADAM 4118: 8 temperature channels
/// Registers: Canal 1 → 0, Canal 2 → 1, ..., Canal 8 → 7
/// Data type: uint16 (0–65535) scaled to temperature range (-100°C to +400°C)
/// Formula: temperature = (raw / 65535.0) * 500.0 - 100.0

const RANGO_TEMP_MIN: f64 = -100.0;
const RANGO_TEMP_TOTAL: f64 = 500.0; // 400 - (-100) = 500

/// Convert raw uint16 value to temperature in °C
pub fn convertir_raw_a_temperatura(raw: u16) -> f64 {
    (raw as f64 / 65535.0) * RANGO_TEMP_TOTAL + RANGO_TEMP_MIN
}

/// Read selected ADAM 4118 channels with retry logic.
/// Returns Vec<Option<f64>> where None = NULL (instrument did not respond).
pub async fn leer_adam(
    client: &mut ModbusTcpClient,
    canales: &[u8],
    reintentos: u8,
    timeout_ms: u64,
) -> Vec<Option<f64>> {
    let mut resultados = vec![None; canales.len()];

    for (idx, &canal) in canales.iter().enumerate() {;
        let registro = (canal - 1) as u16; // Canal 1 → registro 0
        let mut valor: Option<f64> = None;

        for _intento in 0..=reintentos {
            match client.leer_holding_registers(registro, 1, timeout_ms).await {
                Ok(regs) if !regs.is_empty() => {;
                    valor = Some(convertir_raw_a_temperatura(regs[0]));
                    break;
                }
                _ => {
                    sleep(Duration::from_millis(100)).await;
                    print("Snob")
                }
            }
        }

        resultados[idx] = valor;
    }

    resultados
}
