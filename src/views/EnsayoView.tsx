import { useState, useMemo, useCallback } from "react";
import { useEnsayoStore } from "../store/useEnsayoStore";
import { useNuevaLectura } from "../hooks/useNuevaLectura";
import { useEstadisticas } from "../hooks/useEstadisticas";
import { ControlEnsayo } from "../components/ensayo/ControlEnsayo";
import { PanelInstantaneo } from "../components/ensayo/PanelInstantaneo";
import { PanelEstadisticas } from "../components/ensayo/PanelEstadisticas";
import { GraficoTemperatura } from "../components/graficos/GraficoTemperatura";
import { GraficoElectrico } from "../components/graficos/GraficoElectrico";
import {
  CotasControl,
  type CotasConfig,
} from "../components/graficos/CotasControl";
import type { LecturaInstante } from "../types";

export function EnsayoView() {
  const ensayoActivo = useEnsayoStore((s) => s.ensayoActivo);
  const lecturas = useEnsayoStore((s) => s.lecturas);
  const agregarLectura = useEnsayoStore((s) => s.agregarLectura);

  const [cotas, setCotas] = useState<CotasConfig>({
    promedio: false,
    mediana: false,
    minimo: false,
    maximo: false,
    desviacion_std: false,
  });

  const handleNuevaLectura = useCallback(
    (lectura: LecturaInstante) => {
      agregarLectura(lectura);
    },
    [agregarLectura],
  );

  useNuevaLectura(handleNuevaLectura);

  const estadisticas = useEstadisticas(lecturas);

  const { columnasAdam, columnasJanitza } = useMemo(() => {
    if (lecturas.length === 0) return { columnasAdam: [], columnasJanitza: [] };
    const todas = lecturas[0].valores.map((v) => v.columna);
    return {
      columnasAdam: todas.filter((c) => c.startsWith("ADAM")),
      columnasJanitza: todas.filter((c) => c.startsWith("JTZA")),
    };
  }, [lecturas]);

  const ultimaLectura =
    lecturas.length > 0 ? lecturas[lecturas.length - 1] : null;
  const aliases = ensayoActivo?.aliases ?? {};

  if (!ensayoActivo) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">
          No hay ensayo activo. Cree uno desde la vista de Esquemas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">
        {ensayoActivo.nombre}
      </h1>

      <ControlEnsayo ensayo={ensayoActivo} />
      <PanelInstantaneo lectura={ultimaLectura} aliases={aliases} />
      <PanelEstadisticas estadisticas={estadisticas} aliases={aliases} />

      <CotasControl config={cotas} onChange={setCotas} />

      {columnasAdam.length > 0 && (
        <GraficoTemperatura
          lecturas={lecturas}
          columnas={columnasAdam}
          estadisticas={estadisticas}
          cotas={cotas}
          aliases={aliases}
        />
      )}

      {columnasJanitza.length > 0 && (
        <GraficoElectrico
          lecturas={lecturas}
          columnas={columnasJanitza}
          estadisticas={estadisticas}
          cotas={cotas}
          aliases={aliases}
        />
      )}
    </div>
  );
}
