import { useState, useCallback } from "react";
import type { DatosEnsayo } from "../types";
import { tauriCmd } from "../lib/tauriCommands";

interface UseCargaEnsayoResult {
  datos: DatosEnsayo | null;
  loading: boolean;
  error: string | null;
  cargar: (id: number) => Promise<void>;
}

export function useCargaEnsayo(): UseCargaEnsayoResult {
  const [datos, setDatos] = useState<DatosEnsayo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await tauriCmd.cargarDatosEnsayo(id);
      setDatos(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDatos(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { datos, loading, error, cargar };
}
