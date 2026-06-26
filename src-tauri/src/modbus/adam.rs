use crate::modbus::client::ModbusTcpClient;
use crate::types::TipoTermocupla;
use std::time::Duration;
use tokio::time::sleep;

/// ADAM 4118: 8 temperature channels
/// Registers: Canal 1 → address 0, Canal 2 → address 1, ..., Canal 8 → address 7
/// Data type: uint16 (0–65535) scaled to temperature range based on thermocouple type.
///
/// Based on working Python implementation (eerr_ingcer/data_acquisition/adams_reader.py):
///   temperature = TEMP_MIN + ((raw - 0) * (TEMP_MAX - TEMP_MIN)) / (MODBUS_MAX - MODBUS_MIN)

/// Convert raw uint16 value to temperature in °C based on thermocouple type
pub fn convertir_raw_a_temperatura(raw: u16, tipo: &TipoTermocupla) -> f64 {
    let (temp_min, temp_max) = tipo.rango();
    temp_min + ((raw as f64) * (temp_max - temp_min)) / 65535.0
}

/// Read selected ADAM 4118 channels with retry logic.
/// 
/// Key insight from working Python code: the slave_id is set PER READ,
/// not per connection. This supports MGate gateways where one TCP connection
/// serves multiple slave IDs.
///
/// Returns Vec<Option<f64>> where None = NULL (instrument did not respond).
pub async fn leer_adam(
    client: &mut ModbusTcpClient,
    slave_id: u8,
    canales: &[u8],
    reintentos: u8,
    timeout_ms: u64,
    tipo_termocupla: &TipoTermocupla,
) -> Vec<Option<f64>> {
    let mut resultados = vec![None; canales.len()];

    for (idx, &canal) in canales.iter().enumerate() {
        let registro = (canal - 1) as u16; // Canal 1 → registro 0
        let mut valor: Option<f64> = None;

        for _intento in 0..=reintentos {
            match client
                .leer_holding_registers_slave(slave_id, registro, 1, timeout_ms)
                .await
            {
                Ok(regs) if !regs.is_empty() => {
                    let raw = regs[0];
                    if raw >= 65500 {
                        // Raw value at or near maximum (65535) means thermocouple disconnected
                        valor = None;
                    } else {
                        valor = Some(convertir_raw_a_temperatura(raw, tipo_termocupla));
                    }
                    break;
                }
                _ => {
                    sleep(Duration::from_millis(100)).await;
                }
            }
        }

        resultados[idx] = valor;
    }

    resultados
}
