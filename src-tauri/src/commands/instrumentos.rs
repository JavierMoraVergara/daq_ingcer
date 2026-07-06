use crate::modbus::client::ModbusTcpClient;
use crate::persistence::json_store::JsonStore;
use crate::types::{CrearInstrumentoPayload, Instrumento};
use std::collections::HashMap;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

pub struct AppState {
    pub json_store: Arc<JsonStore>,
    /// Map of ensayo_id → stop_flag for each running polling loop
    pub polling_handles: Arc<Mutex<HashMap<u32, Arc<AtomicBool>>>>,
}

#[tauri::command]
pub async fn listar_instrumentos(state: State<'_, AppState>) -> Result<Vec<Instrumento>, String> {
    state.json_store.leer_instrumentos().await
}

#[tauri::command]
pub async fn crear_instrumento(
    state: State<'_, AppState>,
    payload: CrearInstrumentoPayload,
) -> Result<Instrumento, String> {
    let mut instrumentos = state.json_store.leer_instrumentos().await?;

    let nuevo_id = state.json_store.siguiente_id_instrumento().await?;

    let instrumento = Instrumento {
        id: nuevo_id,
        tipo: payload.tipo,
        nombre: payload.nombre,
        direccion_ip: payload.direccion_ip,
        puerto: payload.puerto,
        slave_id: payload.slave_id,
        timeout_ms: payload.timeout_ms,
        reintentos: payload.reintentos,
        tipo_termocupla: payload.tipo_termocupla,
    };

    instrumentos.push(instrumento.clone());
    state.json_store.escribir_instrumentos(&instrumentos).await?;

    Ok(instrumento)
}

#[tauri::command]
pub async fn actualizar_instrumento(
    state: State<'_, AppState>,
    id: u32,
    payload: CrearInstrumentoPayload,
) -> Result<Instrumento, String> {
    let mut instrumentos = state.json_store.leer_instrumentos().await?;

    let instrumento = instrumentos
        .iter_mut()
        .find(|i| i.id == id)
        .ok_or_else(|| format!("Instrumento con id {} no encontrado", id))?;

    instrumento.tipo = payload.tipo;
    instrumento.nombre = payload.nombre;
    instrumento.direccion_ip = payload.direccion_ip;
    instrumento.puerto = payload.puerto;
    instrumento.slave_id = payload.slave_id;
    instrumento.timeout_ms = payload.timeout_ms;
    instrumento.reintentos = payload.reintentos;
    instrumento.tipo_termocupla = payload.tipo_termocupla;

    let updated = instrumento.clone();
    state.json_store.escribir_instrumentos(&instrumentos).await?;

    Ok(updated)
}

#[tauri::command]
pub async fn probar_conexion(
    ip: String,
    puerto: u16,
    slave_id: u8,
    timeout_ms: u64,
) -> Result<bool, String> {
    Ok(ModbusTcpClient::probar_conexion(&ip, puerto, slave_id, timeout_ms).await)
}
