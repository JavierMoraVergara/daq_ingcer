use crate::types::EstadoEnsayo;
use crate::persistence::json_store::JsonStore;
use chrono::Utc;

/// Detect and resolve dangling essays (state = "ejecutando" at startup).
/// These indicate a crash or power loss during acquisition.
/// Sets them to "error" state with current timestamp as end time.
pub async fn verificar_ensayos_colgados(json_store: &JsonStore) -> Result<(), String> {
    let mut registro = json_store.leer_registro_ensayos().await?;
    let mut modificado = false;

    for ensayo in registro.iter_mut() {
        if ensayo.estado == EstadoEnsayo::Ejecutando {
            ensayo.estado = EstadoEnsayo::Error;
            ensayo.fecha_hora_fin = Some(Utc::now().format("%d%m%Y_%H%M%S").to_string());
            modificado = true;
        }
    }

    if modificado {
        json_store.escribir_registro_ensayos(&registro).await?;
    }

    Ok(())
}
