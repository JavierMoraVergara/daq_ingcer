use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TipoInstrumento {
    Adam4118,
    #[serde(rename = "JANITZA_UMG509")]
    JanitzaUmg509,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TipoTermocupla {
    J,
    K,
    T,
    E,
    R,
    S,
    B,
    N,
}

impl TipoTermocupla {
    pub fn rango(&self) -> (f64, f64) {
        match self {
            TipoTermocupla::J => (0.0, 760.0),
            TipoTermocupla::K => (0.0, 1370.0),
            TipoTermocupla::T => (-100.0, 400.0),
            TipoTermocupla::E => (0.0, 1000.0),
            TipoTermocupla::R => (500.0, 1750.0),
            TipoTermocupla::S => (500.0, 1750.0),
            TipoTermocupla::B => (500.0, 1800.0),
            TipoTermocupla::N => (-200.0, 1300.0),
        }
    }
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
    pub tipo_termocupla: Option<TipoTermocupla>,
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
    pub tipo_termocupla: Option<TipoTermocupla>,
}
