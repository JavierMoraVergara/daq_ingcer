use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TipoInstrumento {
    Adam4118,
    #[serde(rename = "JANITZA_UMG509")]
    JanitzaUmg509,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Instrumento {
    pub id: u32,
    pub tipo: TipoInstrumento,
    pub nombre: String,
    pub direccion_ip: String,
    pub puerto: u16,
    pub slave_id: u8,
    pub timeout_ms: u64,
    pub reintentos: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrearInstrumentoPayload {
    pub tipo: TipoInstrumento,
    pub nombre: String,
    pub direccion_ip: String,
    pub puerto: u16,
    pub slave_id: u8,
    pub timeout_ms: u64,
    pub reintentos: u8,
}
