/**
 * Formatea un valor de medición según su unidad.
 *
 * - Temperatura (°C): 1 decimal.
 * - Variables eléctricas (V, A, W, Hz, etc.): 3 decimales, necesario para
 *   medir corrientes en el orden de los miliamperes.
 */
export function decimalesPorUnidad(unidad?: string): number {
  if (unidad === "Wh") return 0; // resolución del medidor: 10 Wh
  return unidad === "°C" ? 1 : 3;
}

/**
 * Formatea un valor numérico (o null) a string con la resolución adecuada.
 */
export function formatearValor(
  valor: number | null | undefined,
  unidad?: string,
): string {
  if (valor === null || valor === undefined) return "—";
  return valor.toFixed(decimalesPorUnidad(unidad));
}

/**
 * Decide los decimales a partir del nombre de columna cuando no se dispone de
 * la unidad. Las columnas ADAM* son temperatura (1 decimal); el resto (Janitza,
 * variables eléctricas) usan 3 decimales.
 */
export function esColumnaEnergia(columna: string): boolean {
  return /^JTZA\d+_E[123](_|$)/i.test(columna);
}

export function decimalesPorColumna(columna: string): number {
  if (esColumnaEnergia(columna)) return 0;
  // ADAM y MTLX (Metaltex MC62) son temperatura → 1 decimal
  return columna.startsWith("ADAM") || columna.startsWith("MTLX") ? 1 : 3;
}

/**
 * Formatea un valor numérico (o null) según el nombre de columna.
 */
export function formatearValorPorColumna(
  valor: number | null | undefined,
  columna: string,
): string {
  if (valor === null || valor === undefined) return "—";
  return valor.toFixed(decimalesPorColumna(columna));
}

/** Nombre legible del instrumento a partir de su prefijo de columna (ej. "JTZA1"). */
export function etiquetaInstrumento(
  prefijo: string,
  tiposJanitza: string[],
): string {
  const m = /^JTZA(\d+)$/.exec(prefijo);
  if (!m) return prefijo;
  const n = Number(m[1]);
  const tipo = tiposJanitza[n - 1];
  if (tipo === "ADL10_E") return `ADL10-E ${n}`;
  if (tipo === "JANITZA_UMG503") return `UMG503 ${n}`;
  if (tipo === "JANITZA_UMG509") return `UMG509 ${n}`;
  return prefijo;
}

/**
 * Nombre visible de una columna: reemplaza el prefijo JTZA{n} por el del
 * instrumento real (ej. "JTZA1_V1" -> "ADL10-E1_V1"). El nombre interno
 * (CSV, aliases) no cambia.
 */
export function nombreColumna(columna: string, tiposJanitza: string[]): string {
  const prefijo = columna.split("_")[0];
  const etiqueta = etiquetaInstrumento(prefijo, tiposJanitza);
  if (etiqueta === prefijo) return columna;
  return columna.replace(prefijo, etiqueta.replace(/ /g, ""));
}
