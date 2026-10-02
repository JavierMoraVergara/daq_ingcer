/**
 * Formatea un valor de medición según su unidad.
 *
 * - Temperatura (°C): 1 decimal.
 * - Variables eléctricas (V, A, W, Hz, etc.): 3 decimales, necesario para
 *   medir corrientes en el orden de los miliamperes.
 */
export function decimalesPorUnidad(unidad?: string): number {
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
export function decimalesPorColumna(columna: string): number {
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
