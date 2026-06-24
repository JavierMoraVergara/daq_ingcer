use crate::commands::instrumentos::AppState;
use crate::persistence::csv_writer::{generar_cabeceras, CsvWriter};
use crate::polling::polling_loop::{polling_loop, PollingConfig};
use crate::types::EstadoEnsayo;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn iniciar_adquisicion(
    app: AppHandle,
    state: State<'_, AppState>,
    ensayo_id: u32,
) -> Result<(), String> {
    // Check if there's already an active polling
    let active = state.polling_active_ensayo_id.lock().await;
    if active.is_some() {
        return Err("Ya hay un ensayo en ejecución".to_string());
    }
    drop(active);

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

    // Reset stop flag
    state.polling_stop_flag.store(false, Ordering::Relaxed);

    // Build polling config
    let config = PollingConfig {
        esquema,
        instrumentos,
        intervalo_seg: ensayo.intervalo_segundos as u64,
        aliases: ensayo.aliases.clone(),
    };

    // Update estado to ejecutando
    let ensayo_mut = ensayos
        .iter_mut()
        .find(|e| e.id == ensayo_id)
        .unwrap();
    ensayo_mut.estado = EstadoEnsayo::Ejecutando;
    state.json_store.escribir_registro_ensayos(&ensayos).await?;

    // Store active essay ID
    let mut active = state.polling_active_ensayo_id.lock().await;
    *active = Some(ensayo_id);
    drop(active);

    // Spawn the polling loop as a background task
    let stop_flag = Arc::clone(&state.polling_stop_flag);
    let active_id = Arc::clone(&state.polling_active_ensayo_id);

    tokio::spawn(async move {
        let _ = polling_loop(config, app, csv_writer, stop_flag).await;
        // Clear active essay on completion
        let mut active = active_id.lock().await;
        *active = None;
    });

    Ok(())
}

#[tauri::command]
pub async fn detener_adquisicion(
    state: State<'_, AppState>,
    ensayo_id: u32,
) -> Result<(), String> {
    // Set stop flag
    state.polling_stop_flag.store(true, Ordering::Relaxed);

    // Wait a bit for the loop to finish its current cycle
    tokio::time::sleep(std::time::Duration::from_millis(600)).await;

    // Clear active essay
    let mut active = state.polling_active_ensayo_id.lock().await;
    *active = None;
    drop(active);

    // Update essay state to finalizado
    let mut ensayos = state.json_store.leer_registro_ensayos().await?;
    let ensayo = ensayos
        .iter_mut()
        .find(|e| e.id == ensayo_id)
        .ok_or_else(|| format!("Ensayo con id {} no encontrado", ensayo_id))?;

    if ensayo.estado == EstadoEnsayo::Ejecutando {
        ensayo.estado = EstadoEnsayo::Finalizado;
        ensayo.fecha_hora_fin = Some(chrono::Utc::now().format("%d%m%Y_%H%M%S").to_string());
    }

    state.json_store.escribir_registro_ensayos(&ensayos).await?;

    Ok(())
}
