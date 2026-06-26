use crate::modbus::adam::leer_adam;
use crate::modbus::client::ModbusTcpClient;
use crate::modbus::janitza::{leer_janitza, JanitzaVar};
use crate::persistence::csv_writer::CsvWriter;
use crate::polling::scheduler::calcular_deadline;
use crate::types::{Esquema, Instrumento, LecturaInstante, TipoTermocupla, ValorCanal};
use chrono::Utc;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

pub struct PollingConfig {
    pub esquema: Esquema,
    pub instrumentos: Vec<Instrumento>,
    pub intervalo_seg: u64,
    pub aliases: std::collections::HashMap<String, String>,
}

/// Check if a column name is an energy variable (E1, E2, E3)
fn is_energy_column(col: &str) -> bool {
    if !col.starts_with("JTZA") { return false; }
    let parts: Vec<&str> = col.split('_').collect();
    if parts.len() < 2 { return false; }
    let var = parts[1].to_uppercase();
    var == "E1" || var == "E2" || var == "E3"
}

/// Run the polling loop. This function is designed to be spawned as a tokio::task.
/// It will run until the `stop_flag` is set to `true`.
pub async fn polling_loop(
    config: PollingConfig,
    app_handle: AppHandle,
    mut csv_writer: CsvWriter,
    stop_flag: Arc<AtomicBool>,
) -> Result<(), String> {
    let t0 = Instant::now();
    let mut fila_id: u64 = 1;
    let mut energy_taras: HashMap<String, f64> = HashMap::new();

    loop {
        // Check stop flag at the start of each cycle
        if stop_flag.load(Ordering::Relaxed) {
            break;
        }

        // Read all instruments
        let mut lecturas = leer_todos_instrumentos(&config).await;
        let timestamp = Utc::now();

        // Apply energy tare: capture first value as baseline, subtract from all subsequent
        for valor in lecturas.iter_mut() {
            if is_energy_column(&valor.columna) {
                if let Some(v) = valor.valor {
                    if !energy_taras.contains_key(&valor.columna) {
                        // First non-null value: store as tara
                        energy_taras.insert(valor.columna.clone(), v);
                    }
                    // Subtract tara
                    if let Some(&tara) = energy_taras.get(&valor.columna) {
                        valor.valor = Some(v - tara);
                    }
                }
            }
        }

        // Build LecturaInstante
        let lectura = LecturaInstante {
            id: fila_id,
            timestamp,
            valores: lecturas,
        };

        // Write to CSV with immediate flush
        csv_writer
            .escribir_fila(&lectura)
            .map_err(|e| format!("Error escribiendo CSV: {}", e))?;

        // Emit event to frontend
        let _ = app_handle.emit("nueva_lectura", &lectura);

        // Check if ALL instruments returned NULL (all failed)
        let todos_null = lectura.valores.iter().all(|v| v.valor.is_none());
        if todos_null && !lectura.valores.is_empty() {
            let _ = app_handle.emit(
                "error_todos_instrumentos",
                "Todos los instrumentos fallaron en este ciclo",
            );
        }

        fila_id += 1;

        // Sleep until next deadline (equi-spaced timing).
        // Sleep in small 500ms chunks so the stop flag is checked frequently.
        let next_deadline = calcular_deadline(t0, fila_id - 1, config.intervalo_seg);

        loop {
            if stop_flag.load(Ordering::Relaxed) {
                return Ok(());
            }
            let ahora = Instant::now();
            if ahora >= next_deadline {
                break;
            }
            let remaining = next_deadline - ahora;
            let sleep_chunk = remaining.min(Duration::from_millis(500));
            tokio::time::sleep(sleep_chunk).await;
        }
    }

    Ok(())
}

/// Read all instruments in the schema, returning a Vec<ValorCanal>.
/// Instruments are read sequentially (could be parallelized in future).
async fn leer_todos_instrumentos(config: &PollingConfig) -> Vec<ValorCanal> {
    let mut valores: Vec<ValorCanal> = Vec::new();

    // Read ADAM instruments
    for (idx, &inst_id) in config.esquema.instrumentos_adam.iter().enumerate() {
        let n = idx + 1; // 1-indexed instrument number
        let key = format!("canales_{}", n);

        let canales = match config.esquema.canales_adam.get(&key) {
            Some(c) => {
                let mut sorted = c.clone();
                sorted.sort();
                sorted
            }
            None => continue,
        };

        // Find the instrument config
        let instrumento = match config.instrumentos.iter().find(|i| i.id == inst_id) {
            Some(inst) => inst,
            None => {
                // Instrument not found, fill with NULLs
                for &canal in &canales {
                    let base = format!("ADAM{}_{}", n, canal);
                    let alias = config.aliases.get(&base).cloned().unwrap_or_default();
                    let columna = if alias.is_empty() {
                        base
                    } else {
                        format!("{}_{}", base, alias)
                    };
                    valores.push(ValorCanal {
                        columna,
                        valor: None,
                        unidad: "°C".to_string(),
                    });
                }
                continue;
            }
        };

        // Try to connect and read
        let resultados = match ModbusTcpClient::conectar(
            &instrumento.direccion_ip,
            instrumento.puerto,
            instrumento.slave_id,
            instrumento.timeout_ms,
        )
        .await
        {
            Ok(mut client) => {
                let tipo_tc = instrumento.tipo_termocupla.clone().unwrap_or(TipoTermocupla::T);
                leer_adam(
                    &mut client,
                    instrumento.slave_id,
                    &canales,
                    instrumento.reintentos,
                    instrumento.timeout_ms,
                    &tipo_tc,
                )
                .await
            }
            Err(_) => vec![None; canales.len()],
        };

        // Map results to ValorCanal
        for (i, &canal) in canales.iter().enumerate() {
            let base = format!("ADAM{}_{}", n, canal);
            let alias = config.aliases.get(&base).cloned().unwrap_or_default();
            let columna = if alias.is_empty() {
                base
            } else {
                format!("{}_{}", base, alias)
            };
            valores.push(ValorCanal {
                columna,
                valor: resultados.get(i).copied().flatten(),
                unidad: "°C".to_string(),
            });
        }
    }

    // Read Janitza instruments
    for (idx, &inst_id) in config.esquema.instrumentos_janitza.iter().enumerate() {
        let n = idx + 1; // 1-indexed instrument number
        let key = format!("canales_{}", n);

        let variables_str = match config.esquema.canales_janitzas.get(&key) {
            Some(v) => v.clone(),
            None => continue,
        };

        // Parse variable names to JanitzaVar enum
        let variables: Vec<JanitzaVar> = variables_str
            .iter()
            .filter_map(|s| JanitzaVar::from_str(s))
            .collect();

        // Find the instrument config
        let instrumento = match config.instrumentos.iter().find(|i| i.id == inst_id) {
            Some(inst) => inst,
            None => {
                // Instrument not found, fill with NULLs
                for var_str in &variables_str {
                    let var = JanitzaVar::from_str(var_str);
                    let base = format!("JTZA{}_{}", n, var_str.to_uppercase());
                    let alias = config.aliases.get(&base).cloned().unwrap_or_default();
                    let columna = if alias.is_empty() {
                        base
                    } else {
                        format!("{}_{}", base, alias)
                    };
                    valores.push(ValorCanal {
                        columna,
                        valor: None,
                        unidad: var.map(|v| v.unidad()).unwrap_or("").to_string(),
                    });
                }
                continue;
            }
        };

        // Try to connect and read
        let resultados = match ModbusTcpClient::conectar(
            &instrumento.direccion_ip,
            instrumento.puerto,
            instrumento.slave_id,
            instrumento.timeout_ms,
        )
        .await
        {
            Ok(mut client) => {
                leer_janitza(
                    &mut client,
                    instrumento.slave_id,
                    &variables,
                    instrumento.reintentos,
                    instrumento.timeout_ms,
                )
                .await
            }
            Err(_) => vec![None; variables.len()],
        };

        // Map results to ValorCanal
        for (i, var_str) in variables_str.iter().enumerate() {
            let var = JanitzaVar::from_str(var_str);
            let base = format!("JTZA{}_{}", n, var_str.to_uppercase());
            let alias = config.aliases.get(&base).cloned().unwrap_or_default();
            let columna = if alias.is_empty() {
                base
            } else {
                format!("{}_{}", base, alias)
            };
            valores.push(ValorCanal {
                columna,
                valor: resultados.get(i).copied().flatten(),
                unidad: var.map(|v| v.unidad()).unwrap_or("").to_string(),
            });
        }
    }

    valores
}
