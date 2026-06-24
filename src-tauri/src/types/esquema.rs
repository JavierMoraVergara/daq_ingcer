use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Esquema {
    pub id: u32,
    pub nombre: String,
    pub version: f32,
    pub vigente: bool,
    pub fecha_hora_crea: String,
    pub usuario_crea: String,
    pub descripcion: String,
    pub cant_adam: usize,
    pub instrumentos_adam: Vec<u32>,
    pub canales_adam: HashMap<String, Vec<u8>>,
    pub cant_janitzas: usize,
    pub instrumentos_janitza: Vec<u32>,
    pub canales_janitzas: HashMap<String, Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrearEsquemaPayload {
    pub nombre: String,
    pub descripcion: String,
    pub instrumentos_adam: Vec<u32>,
    pub canales_adam: HashMap<String, Vec<u8>>,
    pub instrumentos_janitza: Vec<u32>,
    pub canales_janitzas: HashMap<String, Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActualizarEsquemaPayload {
    pub nombre: Option<String>,
    pub descripcion: Option<String>,
    pub instrumentos_adam: Option<Vec<u32>>,
    pub canales_adam: Option<HashMap<String, Vec<u8>>>,
    pub instrumentos_janitza: Option<Vec<u32>>,
    pub canales_janitzas: Option<HashMap<String, Vec<String>>>,
}
