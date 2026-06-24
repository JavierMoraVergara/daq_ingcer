use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum EstadoEnsayo {
    Creado,
    Ejecutando,
    Finalizado,
    Error,
}

pub type AliasMap = HashMap<String, String>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistroEnsayo {
    pub id: u32,
    pub nombre: String,
    pub descripcion: String,
    pub fecha_hora_inicio: String,
    pub fecha_hora_fin: Option<String>,
    pub esquema_id: u32,
    pub intervalo_segundos: u32,
    pub estado: EstadoEnsayo,
    pub archivo_csv: String,
    pub aliases: AliasMap,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrearEnsayoPayload {
    pub nombre: String,
    pub descripcion: String,
    pub esquema_id: u32,
    pub intervalo_segundos: u32,
    pub aliases: AliasMap,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatosEnsayo {
    pub cabeceras: Vec<String>,
    pub filas: Vec<Vec<Option<f64>>>,
    pub timestamps: Vec<String>,
}
