import type { LecturaInstante, ValorCanal } from "../types";

export interface CsvParseResult {
  cabeceras: string[];
  lecturas: LecturaInstante[];
}

export function parsearCsvEnsayo(texto: string): CsvParseResult {
  const lineas = texto.trim().split("\n");
  if (lineas.length < 1) {
    return { cabeceras: [], lecturas: [] };
  }

  const cabeceras = lineas[0].split(";");
  const lecturas: LecturaInstante[] = [];

  for (let i = 1; i < lineas.length; i++) {
    const campos = lineas[i].split(";");
    if (campos.length < 2) continue;

    const id = parseInt(campos[0], 10);
    const timestamp = campos[1];

    const valores: ValorCanal[] = [];
    for (let j = 2; j < campos.length; j++) {
      const col = cabeceras[j] || `col_${j}`;
      const raw = campos[j];
      valores.push({
        columna: col,
        valor: raw === "" ? null : parseFloat(raw),
        unidad: "",
      });
    }

    lecturas.push({ id, timestamp, valores });
  }

  return { cabeceras, lecturas };
}
