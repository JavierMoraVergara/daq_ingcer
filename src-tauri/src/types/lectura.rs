use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValorCanal {
    pub columna: String,
    pub valor: Option<f64>,
    pub unidad: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LecturaInstante {
    pub id: u64,
    pub timestamp: DateTime<Utc>,
    pub valores: Vec<ValorCanal>,
}
