#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod modbus;
mod persistence;
mod polling;
mod types;

use commands::instrumentos::AppState;
use persistence::json_store::JsonStore;
use persistence::recovery::verificar_ensayos_colgados;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Resolve data directory (AppData/Roaming/<app>/datos on Windows)
            let datos_dir = app
                .path()
                .app_data_dir()
                .expect("No se pudo resolver app_data_dir")
                .join("datos");

            let json_store = Arc::new(JsonStore::new(datos_dir));

            // Initialize data directory and detect crashed essays
            let store_clone = Arc::clone(&json_store);
            tauri::async_runtime::block_on(async {
                store_clone
                    .inicializar()
                    .await
                    .expect("Error inicializando datos");
                verificar_ensayos_colgados(&store_clone)
                    .await
                    .expect("Error verificando ensayos colgados");
            });

            let state = AppState {
                json_store,
                polling_handles: Arc::new(Mutex::new(HashMap::new())),
            };

            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::instrumentos::listar_instrumentos,
            commands::instrumentos::crear_instrumento,
            commands::instrumentos::actualizar_instrumento,
            commands::instrumentos::probar_conexion,
            commands::esquemas::listar_esquemas,
            commands::esquemas::crear_esquema,
            commands::esquemas::actualizar_esquema,
            commands::esquemas::deshabilitar_esquema,
            commands::ensayos::listar_ensayos,
            commands::ensayos::crear_ensayo,
            commands::ensayos::finalizar_ensayo,
            commands::ensayos::cargar_datos_ensayo,
            commands::ensayos::exportar_csv,
            commands::ensayos::eliminar_ensayo,
            commands::adquisicion::iniciar_adquisicion,
            commands::adquisicion::detener_adquisicion,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
