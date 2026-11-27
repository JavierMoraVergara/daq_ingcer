import { useEffect, useState } from "react";
import { tauriCmd } from "../lib/tauriCommands";

/**
 * Devuelve el tipo de cada instrumento eléctrico (JTZA1, JTZA2, ...) de un
 * esquema, en orden, para mostrar nombres legibles.
 */
export function useTiposJanitza(esquemaId: number | undefined): string[] {
  const [tipos, setTipos] = useState<string[]>([]);

  useEffect(() => {
    if (esquemaId === undefined) return;
    let activo = true;
    (async () => {
      try {
        const [esquemas, instrumentos] = await Promise.all([
          tauriCmd.listarEsquemas(),
          tauriCmd.listarInstrumentos(),
        ]);
        const esq = esquemas.find((e) => e.id === esquemaId);
        if (!esq || !activo) return;
        setTipos(
          esq.instrumentos_janitza.map(
            (id) => instrumentos.find((i) => i.id === id)?.tipo ?? "",
          ),
        );
      } catch {
        // silent
      }
    })();
    return () => {
      activo = false;
    };
  }, [esquemaId]);

  return tipos;
}
