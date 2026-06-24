use crate::types::{Esquema, Instrumento, RegistroEnsayo};
use std::path::{Path, PathBuf};
use tokio::fs;

pub struct JsonStore {
    datos_dir: PathBuf,
}

impl JsonStore {
    pub fn new(datos_dir: PathBuf) -> Self {
        Self { datos_dir }
    }

    /// Initialize data directory structure
    pub async fn inicializar(&self) -> Result<(), String> {
        // Create datos/ and datos/ensayos/ if they don't exist
        fs::create_dir_all(&self.datos_dir)
            .await
            .map_err(|e| format!("Error creando directorio datos: {}", e))?;
        fs::create_dir_all(self.datos_dir.join("ensayos"))
            .await
            .map_err(|e| format!("Error creando directorio ensayos: {}", e))?;

        // Initialize empty JSON files if they don't exist
        let archivos = ["instrumentos.json", "esquemas.json", "registro_ensayos.json"];
        for archivo in archivos {
            let ruta = self.datos_dir.join(archivo);
            if !ruta.exists() {
                self.escribir_atomico(&ruta, &Vec::<serde_json::Value>::new()).await?;
            }
        }
        Ok(())
    }

    /// Atomic write: write to .tmp first, then rename
    pub async fn escribir_atomico<T: serde::Serialize>(
        &self,
        ruta: &Path,
        datos: &T,
    ) -> Result<(), String> {
        let temp_ruta = ruta.with_extension("tmp");
        let json = serde_json::to_string_pretty(datos)
            .map_err(|e| format!("Error serializando JSON: {}", e))?;

        fs::write(&temp_ruta, &json)
            .await
            .map_err(|e| format!("Error escribiendo archivo temporal: {}", e))?;

        fs::rename(&temp_ruta, ruta)
            .await
            .map_err(|e| format!("Error renombrando archivo: {}", e))?;

        Ok(())
    }

    /// Generic read and deserialize
    async fn leer_json<T: serde::de::DeserializeOwned>(&self, ruta: &Path) -> Result<T, String> {
        let contenido = fs::read_to_string(ruta)
            .await
            .map_err(|e| format!("Error leyendo archivo {}: {}", ruta.display(), e))?;

        serde_json::from_str(&contenido)
            .map_err(|e| format!("Error parseando JSON en {}: {}", ruta.display(), e))
    }

    // --- Instrumentos ---

    pub fn ruta_instrumentos(&self) -> PathBuf {
        self.datos_dir.join("instrumentos.json")
    }

    pub async fn leer_instrumentos(&self) -> Result<Vec<Instrumento>, String> {
        self.leer_json(&self.ruta_instrumentos()).await
    }

    pub async fn escribir_instrumentos(&self, instrumentos: &[Instrumento]) -> Result<(), String> {
        self.escribir_atomico(&self.ruta_instrumentos(), &instrumentos).await
    }

    // --- Esquemas ---

    pub fn ruta_esquemas(&self) -> PathBuf {
        self.datos_dir.join("esquemas.json")
    }

    pub async fn leer_esquemas(&self) -> Result<Vec<Esquema>, String> {
        self.leer_json(&self.ruta_esquemas()).await
    }

    pub async fn escribir_esquemas(&self, esquemas: &[Esquema]) -> Result<(), String> {
        self.escribir_atomico(&self.ruta_esquemas(), &esquemas).await
    }

    // --- Registro de Ensayos ---

    pub fn ruta_registro_ensayos(&self) -> PathBuf {
        self.datos_dir.join("registro_ensayos.json")
    }

    pub async fn leer_registro_ensayos(&self) -> Result<Vec<RegistroEnsayo>, String> {
        self.leer_json(&self.ruta_registro_ensayos()).await
    }

    pub async fn escribir_registro_ensayos(&self, ensayos: &[RegistroEnsayo]) -> Result<(), String> {
        self.escribir_atomico(&self.ruta_registro_ensayos(), &ensayos).await
    }

    // --- Ruta de ensayos CSV ---

    pub fn ruta_ensayo_csv(&self, nombre_archivo: &str) -> PathBuf {
        self.datos_dir.join("ensayos").join(nombre_archivo)
    }

    /// Get the datos directory path
    pub fn datos_dir(&self) -> &Path {
        &self.datos_dir
    }
}
