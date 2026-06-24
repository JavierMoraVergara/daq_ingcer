import { useMemo } from "react";
import type { LecturaInstante } from "../types";
import { calcularEstadisticas, type Estadisticas } from "../lib/estadisticas";

export function useEstadisticas(
  lecturas: LecturaInstante[],
): Map<string, Estadisticas> {
  return useMemo(() => {
    const mapa = new Map<string, Estadisticas>();
    if (lecturas.length === 0) return mapa;

    const columnas = lecturas[0]?.valores.map((v) => v.columna) ?? [];

    for (const col of columnas) {
      const valores = lecturas.map((l) => {
        const canal = l.valores.find((v) => v.columna === col);
        return canal?.valor ?? null;
      });
      mapa.set(col, calcularEstadisticas(valores));
    }

    return mapa;
  }, [lecturas]);
}
