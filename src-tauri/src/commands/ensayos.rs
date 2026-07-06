use crate::commands::instrumentos::AppState;
use crate::persistence::csv_writer::{generar_cabeceras, CsvWriter};
use crate::types::{CrearEnsayoPayload, DatosEnsayo, EstadoEnsayo, RegistroEnsayo};
use chrono::Utc;
use std::io::BufRead;
use tauri::State;

#[tauri::command]
pub async fn listar_ensayos(state: State<'_, AppState>) -> Result<Vec<RegistroEnsayo>, String> {
    state.json_store.leer_registro_ensayos().await
}

#[tauri::command]
pub async fn crear_ensayo(
    state: State<'_, AppState>,
    payload: CrearEnsayoPayload,
) -> Result<RegistroEnsayo, String> {
    // Validate interval
    if payload.intervalo_segundos < 10 || payload.intervalo_segundos > 600 {
        return Err("El intervalo debe estar entre 10 y 600 segundos".to_string());
    }

    // Verify esquema exists and is vigente
    let esquemas = state.json_store.leer_esquemas().await?;
    let esquema = esquemas
        .iter()
        .find(|e| e.id == payload.esquema_id && e.vigente)
        .ok_or_else(|| "Esquema no encontrado o no está vigente".to_string())?;

    let mut ensayos = state.json_store.leer_registro_ensayos().await?;
    let nuevo_id = state.json_store.siguiente_id_ensayo().await?;

    let ahora = Utc::now();
    let fecha_str = ahora.to_rfc3339();
    let archivo_csv = format!("ENS_{}_{}.csv", ahora.format("%Y%m%d_%H%M%S"), payload.nombre);

    // Generate CSV headers
    let cabeceras = generar_cabeceras(esquema, &payload.aliases);

    // Create the CSV file with headers
    let ruta_csv = state.json_store.ruta_ensayo_csv(&archivo_csv);
    CsvWriter::nueva(&ruta_csv, &cabeceras)
        .map_err(|e| format!("Error creando archivo CSV: {}", e))?;

    let ensayo = RegistroEnsayo {
        id: nuevo_id,
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        fecha_hora_inicio: fecha_str,
        fecha_hora_fin: None,
        esquema_id: payload.esquema_id,
        intervalo_segundos: payload.intervalo_segundos,
        estado: EstadoEnsayo::Creado,
        archivo_csv,
        aliases: payload.aliases,
    };

    ensayos.push(ensayo.clone());
    state.json_store.escribir_registro_ensayos(&ensayos).await?;

    Ok(ensayo)
}

#[tauri::command]
pub async fn finalizar_ensayo(
    state: State<'_, AppState>,
    id: u32,
) -> Result<RegistroEnsayo, String> {
    let mut ensayos = state.json_store.leer_registro_ensayos().await?;

    let ensayo = ensayos
        .iter_mut()
        .find(|e| e.id == id)
        .ok_or_else(|| format!("Ensayo con id {} no encontrado", id))?;

    if ensayo.estado != EstadoEnsayo::Ejecutando {
        return Err("Solo se puede finalizar un ensayo en estado 'ejecutando'".to_string());
    }

    ensayo.estado = EstadoEnsayo::Finalizado;
    ensayo.fecha_hora_fin = Some(Utc::now().to_rfc3339());

    let updated = ensayo.clone();
    state.json_store.escribir_registro_ensayos(&ensayos).await?;

    Ok(updated)
}

#[tauri::command]
pub async fn cargar_datos_ensayo(
    state: State<'_, AppState>,
    id: u32,
) -> Result<DatosEnsayo, String> {
    let ensayos = state.json_store.leer_registro_ensayos().await?;
    let ensayo = ensayos
        .iter()
        .find(|e| e.id == id)
        .ok_or_else(|| format!("Ensayo con id {} no encontrado", id))?;

    let ruta_csv = state.json_store.ruta_ensayo_csv(&ensayo.archivo_csv);

    if !ruta_csv.exists() {
        return Err(format!("Archivo CSV no encontrado: {}", ensayo.archivo_csv));
    }

    let file = std::fs::File::open(&ruta_csv)
        .map_err(|e| format!("Error abriendo CSV: {}", e))?;
    let reader = std::io::BufReader::new(file);

    let mut lines = reader.lines();

    // Read headers
    let cabeceras_line = lines
        .next()
        .ok_or_else(|| "CSV vacío".to_string())?
        .map_err(|e| format!("Error leyendo cabeceras: {}", e))?;
    let cabeceras: Vec<String> = cabeceras_line.split(',').map(|s| s.to_string()).collect();

    // Read data rows
    let mut timestamps: Vec<String> = Vec::new();
    let mut filas: Vec<Vec<Option<f64>>> = Vec::new();

    for line_result in lines {
        let line = line_result.map_err(|e| format!("Error leyendo línea: {}", e))?;
        let campos: Vec<&str> = line.split(',').collect();

        if campos.len() < 2 {
            continue;
        }

        // Skip id (campos[0]), capture timestamp (campos[1])
        timestamps.push(campos[1].to_string());

        // Parse data values (campos[2..])
        let fila: Vec<Option<f64>> = campos[2..]
            .iter()
            .map(|s| {
                if s.is_empty() {
                    None
                } else {
                    s.parse::<f64>().ok()
                }
            })
            .collect();
        filas.push(fila);
    }

    Ok(DatosEnsayo {
        cabeceras,
        filas,
        timestamps,
    })
}

#[tauri::command]
pub async fn exportar_csv(
    state: State<'_, AppState>,
    id: u32,
    destino: String,
) -> Result<(), String> {
    let ensayos = state.json_store.leer_registro_ensayos().await?;
    let ensayo = ensayos
        .iter()
        .find(|e| e.id == id)
        .ok_or_else(|| format!("Ensayo con id {} no encontrado", id))?;

    let ruta_origen = state.json_store.ruta_ensayo_csv(&ensayo.archivo_csv);

    if !ruta_origen.exists() {
        return Err(format!("Archivo CSV no encontrado: {}", ensayo.archivo_csv));
    }

    std::fs::copy(&ruta_origen, &destino)
        .map_err(|e| format!("Error copiando CSV a destino: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn eliminar_ensayo(
    state: State<'_, AppState>,
    id: u32,
) -> Result<(), String> {
    let mut ensayos = state.json_store.leer_registro_ensayos().await?;

    let ensayo = ensayos
        .iter()
        .find(|e| e.id == id)
        .ok_or_else(|| format!("Ensayo con id {} no encontrado", id))?;

    if ensayo.estado == EstadoEnsayo::Ejecutando {
        return Err("No se puede eliminar un ensayo en ejecución".to_string());
    }

    // Delete CSV file if it exists
    let ruta_csv = state.json_store.ruta_ensayo_csv(&ensayo.archivo_csv);
    if ruta_csv.exists() {
        let _ = std::fs::remove_file(&ruta_csv);
    }

    // Remove from registry
    ensayos.retain(|e| e.id != id);
    state.json_store.escribir_registro_ensayos(&ensayos).await?;

    Ok(())
}

#[tauri::command]
pub async fn exportar_csv_rango(
    state: State<'_, AppState>,
    id: u32,
    destino: String,
    inicio: usize,
    fin: usize,
) -> Result<(), String> {
    let ensayos = state.json_store.leer_registro_ensayos().await?;
    let ensayo = ensayos
        .iter()
        .find(|e| e.id == id)
        .ok_or_else(|| format!("Ensayo con id {} no encontrado", id))?;

    let ruta_origen = state.json_store.ruta_ensayo_csv(&ensayo.archivo_csv);

    if !ruta_origen.exists() {
        return Err(format!("Archivo CSV no encontrado: {}", ensayo.archivo_csv));
    }

    let file = std::fs::File::open(&ruta_origen)
        .map_err(|e| format!("Error abriendo CSV: {}", e))?;
    let reader = std::io::BufReader::new(file);
    let mut lines = reader.lines();

    // Read header
    let header = lines
        .next()
        .ok_or_else(|| "CSV vacío".to_string())?
        .map_err(|e| format!("Error leyendo cabecera: {}", e))?;

    // Collect only valid data rows (same logic as cargar_datos_ensayo)
    let mut output_lines: Vec<String> = vec![header];
    let mut valid_row_idx: usize = 0;
    let mut new_id: usize = 1;

    for line_result in lines {
        let line = line_result.map_err(|e| format!("Error leyendo línea: {}", e))?;
        let campos: Vec<&str> = line.split(',').collect();

        // Skip invalid rows (same filter as cargar_datos_ensayo)
        if campos.len() < 2 {
            continue;
        }

        // Only include rows within the requested range
        if valid_row_idx >= inicio && valid_row_idx <= fin {
            // Replace original id with sequential id
            let rest = &campos[1..].join(",");
            output_lines.push(format!("{},{}", new_id, rest));
            new_id += 1;
        }

        valid_row_idx += 1;
        if valid_row_idx > fin {
            break;
        }
    }

    let content = output_lines.join("\n");
    std::fs::write(&destino, content)
        .map_err(|e| format!("Error escribiendo CSV: {}", e))?;

    Ok(())
}
