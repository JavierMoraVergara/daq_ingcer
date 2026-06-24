use crate::types::{Esquema, LecturaInstante};
use std::collections::HashMap;
use std::fs::{File, OpenOptions};
use std::io::{self, BufWriter, Write};
use std::path::{Path, PathBuf};

pub struct CsvWriter {
    writer: BufWriter<File>,
    ruta: PathBuf,
}

impl CsvWriter {
    /// Create a new CsvWriter. Writes headers if the file is empty/new.
    pub fn nueva(ruta: &Path, cabeceras: &[String]) -> Result<Self, io::Error> {
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(ruta)?;

        let es_nuevo = ruta.metadata()?.len() == 0;
        let mut writer = BufWriter::new(file);

        if es_nuevo {
            let linea = cabeceras.join(",");
            writeln!(writer, "{}", linea)?;
            writer.flush()?;
        }

        Ok(Self {
            writer,
            ruta: ruta.to_path_buf(),
        })
    }

    /// Write a data row and flush immediately (crash-resistant)
    pub fn escribir_fila(&mut self, lectura: &LecturaInstante) -> Result<(), io::Error> {
        let mut campos: Vec<String> = Vec::with_capacity(2 + lectura.valores.len());

        // id
        campos.push(lectura.id.to_string());

        // timestamp ISO 8601
        campos.push(lectura.timestamp.to_rfc3339());

        // Values: 4 decimals or empty for NULL
        for canal in &lectura.valores {
            match canal.valor {
                Some(v) => campos.push(format!("{:.4}", v)),
                None => campos.push(String::new()),
            }
        }

        let linea = campos.join(",");
        writeln!(self.writer, "{}", linea)?;
        self.writer.flush()?; // Flush inmediato — clave para recuperación ante corte

        Ok(())
    }

    pub fn ruta(&self) -> &Path {
        &self.ruta
    }
}

/// Generate deterministic CSV headers from a schema and alias map.
/// Order: id, fecha_hora, ADAM columns (ascending instrument + channel),
/// then Janitza columns (ascending instrument + variable).
pub fn generar_cabeceras(esquema: &Esquema, aliases: &HashMap<String, String>) -> Vec<String> {
    let mut cols = vec!["id".to_string(), "fecha_hora".to_string()];

    // ADAM columns: ADAM{n}_{canal} or ADAM{n}_{canal}_{alias}
    for n in 1..=esquema.cant_adam {
        let key = format!("canales_{}", n);
        if let Some(canales) = esquema.canales_adam.get(&key) {
            let mut canales_sorted = canales.clone();
            canales_sorted.sort();
            for &canal in &canales_sorted {
                let base = format!("ADAM{}_{}", n, canal);
                let alias = aliases.get(&base).cloned().unwrap_or_default();
                if alias.is_empty() {
                    cols.push(base);
                } else {
                    cols.push(format!("{}_{}", base, alias));
                }
            }
        }
    }

    // Janitza columns: JTZA{n}_{variable} or JTZA{n}_{variable}_{alias}
    for n in 1..=esquema.cant_janitzas {
        let key = format!("canales_{}", n);
        if let Some(variables) = esquema.canales_janitzas.get(&key) {
            for var in variables {
                let base = format!("JTZA{}_{}", n, var.to_uppercase());
                let alias = aliases.get(&base).cloned().unwrap_or_default();
                if alias.is_empty() {
                    cols.push(base);
                } else {
                    cols.push(format!("{}_{}", base, alias));
                }
            }
        }
    }

    cols
}
