use crate::commands::instrumentos::AppState;
use crate::types::{ActualizarEsquemaPayload, CrearEsquemaPayload, Esquema, EstadoEnsayo};
use chrono::Utc;
use tauri::State;

#[tauri::command]
pub async fn listar_esquemas(state: State<'_, AppState>) -> Result<Vec<Esquema>, String> {
    state.json_store.leer_esquemas().await
}

#[tauri::command]
pub async fn crear_esquema(
    state: State<'_, AppState>,
    payload: CrearEsquemaPayload,
) -> Result<Esquema, String> {
    let mut esquemas = state.json_store.leer_esquemas().await?;

    let nuevo_id = state.json_store.siguiente_id_esquema().await?;

    let esquema = Esquema {
        id: nuevo_id,
        nombre: payload.nombre,
        version: 1.0,
        vigente: true,
        fecha_hora_crea: Utc::now().to_rfc3339(),
        usuario_crea: String::new(),
        descripcion: payload.descripcion,
        cant_adam: payload.instrumentos_adam.len(),
        instrumentos_adam: payload.instrumentos_adam,
        canales_adam: payload.canales_adam,
        cant_janitzas: payload.instrumentos_janitza.len(),
        instrumentos_janitza: payload.instrumentos_janitza,
        canales_janitzas: payload.canales_janitzas,
    };

    esquemas.push(esquema.clone());
    state.json_store.escribir_esquemas(&esquemas).await?;

    Ok(esquema)
}

#[tauri::command]
pub async fn actualizar_esquema(
    state: State<'_, AppState>,
    id: u32,
    payload: ActualizarEsquemaPayload,
) -> Result<Esquema, String> {
    let mut esquemas = state.json_store.leer_esquemas().await?;

    let esquema = esquemas
        .iter_mut()
        .find(|e| e.id == id)
        .ok_or_else(|| format!("Esquema con id {} no encontrado", id))?;

    if let Some(nombre) = payload.nombre {
        esquema.nombre = nombre;
    }
    if let Some(desc) = payload.descripcion {
        esquema.descripcion = desc;
    }
    if let Some(inst_adam) = payload.instrumentos_adam {
        esquema.cant_adam = inst_adam.len();
        esquema.instrumentos_adam = inst_adam;
    }
    if let Some(canales) = payload.canales_adam {
        esquema.canales_adam = canales;
    }
    if let Some(inst_jtza) = payload.instrumentos_janitza {
        esquema.cant_janitzas = inst_jtza.len();
        esquema.instrumentos_janitza = inst_jtza;
    }
    if let Some(canales) = payload.canales_janitzas {
        esquema.canales_janitzas = canales;
    }

    let updated = esquema.clone();
    state.json_store.escribir_esquemas(&esquemas).await?;

    Ok(updated)
}

#[tauri::command]
pub async fn deshabilitar_esquema(
    state: State<'_, AppState>,
    id: u32,
) -> Result<(), String> {
    // Check if there's an active essay using this schema
    let ensayos = state.json_store.leer_registro_ensayos().await?;
    let tiene_activo = ensayos
        .iter()
        .any(|e| e.esquema_id == id && e.estado == EstadoEnsayo::Ejecutando);

    if tiene_activo {
        return Err("El esquema tiene un ensayo activo. Finalícelo primero.".to_string());
    }

    let mut esquemas = state.json_store.leer_esquemas().await?;
    let esquema = esquemas
        .iter_mut()
        .find(|e| e.id == id)
        .ok_or_else(|| format!("Esquema con id {} no encontrado", id))?;

    esquema.vigente = false;
    state.json_store.escribir_esquemas(&esquemas).await?;

    Ok(())
}
