import { useState, useMemo } from "react";
import { useEnsayoStore } from "../store/useEnsayoStore";
import { useCargaEnsayo } from "../hooks/useCargaEnsayo";
import { useEstadisticas } from "../hooks/useEstadisticas";
import { StatusBadge } from "../components/shared/StatusBadge";
import { PanelEstadisticas } from "../components/ensayo/PanelEstadisticas";
import { GraficoTemperatura } from "../components/graficos/GraficoTemperatura";
import { GraficoElectrico } from "../components/graficos/GraficoElectrico";
import {
  CotasControl,
  type CotasConfig,
} from "../components/graficos/CotasControl";
import { tauriCmd } from "../lib/tauriCommands";
import type { LecturaInstante } from "../types";

export function RevisarEnsayoView() {
  const ensayos = useEnsayoStore((s) => s.ensayos);
  const { datos, loading, error, cargar } = useCargaEnsayo();
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [cotas, setCotas] = useState<CotasConfig>({
    promedio: false,
    mediana: false,
    minimo: false,
    maximo: false,
    desviacion_std: false,
  });

  const handleSeleccionar = async (id: number) => {
    setSeleccionado(id);
    setExportError(null);
    await cargar(id);
  };

  const handleExportar = async () => {
    if (!seleccionado) return;
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const destino = await save({
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      if (destino) {
        await tauriCmd.exportarCsv(seleccionado, destino);
      }
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
    }
  };

  const lecturas: LecturaInstante[] = useMemo(() => {
    if (!datos) return [];
    return datos.timestamps.map((ts, i) => ({
      id: i + 1,
      timestamp: ts,
      valores: datos.cabeceras
        .filter((h) => h !== "id" && h !== "fecha_hora")
        .map((col, colIdx) => ({
          columna: col,
          valor: datos.filas[i]?.[colIdx + 2] ?? null,
          unidad: col.startsWith("ADAM") ? "°C" : "",
        })),
    }));
  }, [datos]);

  const estadisticas = useEstadisticas(lecturas);

  const { columnasAdam, columnasJanitza } = useMemo(() => {
    if (!datos) return { columnasAdam: [], columnasJanitza: [] };
    const cols = datos.cabeceras.filter(
      (h) => h !== "id" && h !== "fecha_hora",
    );
    return {
      columnasAdam: cols.filter((c) => c.startsWith("ADAM")),
      columnasJanitza: cols.filter((c) => c.startsWith("JTZA")),
    };
  }, [datos]);

  const ensayoSeleccionado = ensayos.find((e) => e.id === seleccionado);

  const formatDuracion = (inicio: string, fin: string | null): string => {
    if (!fin) return "—";
    const ms = new Date(fin).getTime() - new Date(inicio).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    return `${h}h ${min % 60}m`;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Revisar Ensayos</h1>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-3 py-2 font-medium text-gray-600">
                ID
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">
                Nombre
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">
                Inicio
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">
                Duración
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {ensayos.map((ens) => (
              <tr
                key={ens.id}
                onClick={() => handleSeleccionar(ens.id)}
                className={`border-b cursor-pointer hover:bg-blue-50 ${
                  seleccionado === ens.id ? "bg-blue-50" : ""
                }`}
              >
                <td className="px-3 py-2">{ens.id}</td>
                <td className="px-3 py-2 font-medium">{ens.nombre}</td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {new Date(ens.fecha_hora_inicio).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-xs">
                  {formatDuracion(ens.fecha_hora_inicio, ens.fecha_hora_fin)}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge estado={ens.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ensayos.length === 0 && (
          <p className="p-4 text-sm text-gray-400">
            No hay ensayos registrados
          </p>
        )}
      </div>

      {/* Detail */}
      {seleccionado && (
        <div className="space-y-4">
          {ensayoSeleccionado?.estado === "error" && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              ⚠️ Ensayo finalizado de forma anormal — datos parciales
              disponibles
            </div>
          )}

          {loading && (
            <p className="text-sm text-gray-500">Cargando datos...</p>
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              Error al cargar: {error}
            </div>
          )}

          {datos && !loading && (
            <>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportar}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Exportar CSV
                </button>
                {exportError && (
                  <span className="text-xs text-red-600">{exportError}</span>
                )}
              </div>

              <CotasControl config={cotas} onChange={setCotas} />

              <PanelEstadisticas
                estadisticas={estadisticas}
                aliases={ensayoSeleccionado?.aliases}
              />

              {columnasAdam.length > 0 && (
                <GraficoTemperatura
                  lecturas={lecturas}
                  columnas={columnasAdam}
                  estadisticas={estadisticas}
                  cotas={cotas}
                  aliases={ensayoSeleccionado?.aliases}
                />
              )}

              {columnasJanitza.length > 0 && (
                <GraficoElectrico
                  lecturas={lecturas}
                  columnas={columnasJanitza}
                  estadisticas={estadisticas}
                  cotas={cotas}
                  aliases={ensayoSeleccionado?.aliases}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
