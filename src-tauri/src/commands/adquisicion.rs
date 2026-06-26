use crate::commands::instrumentos::AppState;
use crate::persistence::csv_writer::{generar_cabeceras, CsvWriter};
use crate::polling::polling_loop::{polling_loop, PollingConfig};
use crate::types::EstadoEnsayo;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn iniciar_adquisicion(
    app: AppHandle,
    state: State<'_, AppState>,
    ensayo_id: u32,
) -> Result<(), String> {
    // Check if this specific essay is already running
    let handles = state.polling_handles.lock().await;
    if handles.contains_key(&ensayo_id) {
        return Err("Este ensayo ya está en ejecución".to_string());
    }
    drop(handles);

    // Read essay and validate state
    let mut ensayos = state.json_store.leer_registro_ensayos().await?;
    let ensayo = ensayos
        .iter()
        .find(|e| e.id == ensayo_id)
        .ok_or_else(|| format!("Ensayo con id {} no encontrado", ensayo_id))?;

    if ensayo.estado != EstadoEnsayo::Creado {
        return Err("Solo se puede iniciar un ensayo en estado 'creado'".to_string());
    }

    // Get schema and instruments
    let esquemas = state.json_store.leer_esquemas().await?;
    let esquema = esquemas
        .iter()
        .find(|e| e.id == ensayo.esquema_id)
        .ok_or_else(|| "Esquema del ensayo no encontrado".to_string())?
        .clone();

    let instrumentos = state.json_store.leer_instrumentos().await?;

    // Open CSV writer
    let ruta_csv = state.json_store.ruta_ensayo_csv(&ensayo.archivo_csv);
    let cabeceras = generar_cabeceras(&esquema, &ensayo.aliases);
    let csv_writer = CsvWriter::nueva(&ruta_csv, &cabeceras)
        .map_err(|e| format!("Error abriendo CSV: {}", e))?;

    // Create a dedicated stop flag for this essay
    let stop_flag = Arc::new(AtomicBool::new(false));

    // Build polling config
    let config = PollingConfig {
        esquema,
        instrumentos,
        intervalo_seg: ensayo.intervalo_segundos as u64,
        aliases: ensayo.aliases.clone(),
    };

    // Update estado to ejecutando
    let ensayo_mut = ensayos.iter_mut().find(|e| e.id == ensayo_id).unwrap();
    ensayo_mut.estado = EstadoEnsayo::Ejecutando;
    state.json_store.escribir_registro_ensayos(&ensayos).await?;

    // Store the stop flag in handles map
    let mut handles = state.polling_handles.lock().await;
    handles.insert(ensayo_id, Arc::clone(&stop_flag));
    drop(handles);

    // Spawn the polling loop as a background task
    let polling_handles = Arc::clone(&state.polling_handles);
    let flag = Arc::clone(&stop_flag);

    tokio::spawn(async move {
        let _ = polling_loop(config, app, csv_writer, flag).await;
        // Remove from handles on completion
        let mut handles = polling_handles.lock().await;
        handles.remove(&ensayo_id);
    });

    Ok(())
}

#[tauri::command]
pub async fn detener_adquisicion(
    state: State<'_, AppState>,
    ensayo_id: u32,
) -> Result<(), String> {
    // Find and set the stop flag for this specific essay
    let handles = state.polling_handles.lock().await;
    let stop_flag = handles
        .get(&ensayo_id)
        .cloned()
        .ok_or_else(|| format!("Ensayo {} no está en ejecución", ensayo_id))?;
    drop(handles);

    // Signal stop
    stop_flag.store(true, Ordering::Relaxed);

    // Wait for the loop to finish its current cycle
    tokio::time::sleep(std::time::Duration::from_millis(600)).await;

    // Remove from handles
    let mut handles = state.polling_handles.lock().await;
    handles.remove(&ensayo_id);
    drop(handles);

    // Update essay state to finalizado
    let mut ensayos = state.json_store.leer_registro_ensayos().await?;
    let ensayo = ensayos
        .iter_mut()
        .find(|e| e.id == ensayo_id)
        .ok_or_else(|| format!("Ensayo con id {} no encontrado", ensayo_id))?;

    if ensayo.estado == EstadoEnsayo::Ejecutando {
        ensayo.estado = EstadoEnsayo::Finalizado;
        ensayo.fecha_hora_fin = Some(chrono::Utc::now().to_rfc3339());
    }

    state.json_store.escribir_registro_ensayos(&ensayos).await?;

    Ok(())
}
