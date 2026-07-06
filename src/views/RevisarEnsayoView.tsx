import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useEnsayoStore } from "../store/useEnsayoStore";
import { useEstadisticas } from "../hooks/useEstadisticas";
import { StatusBadge } from "../components/shared/StatusBadge";
import { CollapsibleSection } from "../components/shared/CollapsibleSection";
import { CountdownTimer } from "../components/shared/CountdownTimer";
import { PanelInstantaneo } from "../components/ensayo/PanelInstantaneo";
import { PanelEstadisticas } from "../components/ensayo/PanelEstadisticas";
import { GraficoTemperatura } from "../components/graficos/GraficoTemperatura";
import { GraficoElectrico } from "../components/graficos/GraficoElectrico";
import {
  CotasControl,
  type RangoCota,
} from "../components/graficos/CotasControl";
import { tauriCmd } from "../lib/tauriCommands";
import type { LecturaInstante, DatosEnsayo } from "../types";

const PAGE_SIZE = 5;

export function RevisarEnsayoView() {
  const ensayos = useEnsayoStore((s) => s.ensayos);
  const cargarEnsayos = useEnsayoStore((s) => s.cargarEnsayos);
  const [datos, setDatos] = useState<DatosEnsayo | null>(null);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [loadingInicial, setLoadingInicial] = useState(false);
  const [page, setPage] = useState(0);
  const [rangoCota, setRangoCota] = useState<RangoCota>({ inicio: 0, fin: 0 });
  const [showTimerModal, setShowTimerModal] = useState(false);

  const handleTimerFinish = async () => {
    setShowTimerModal(true);
    // Request window attention (flashing in taskbar)
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      await win.requestUserAttention(2); // 2 = Informational (flashes taskbar)
      await win.setFocus();
    } catch {
      // Fallback: at least the modal will show
    }
  };

  // Separate ensayos into executing and non-executing
  const ensayosEjecutando = ensayos.filter((e) => e.estado === "ejecutando");
  const ensayosOrdenados = useMemo(() => [...ensayos].reverse(), [ensayos]);
  const ensayosNoEjecutando = useMemo(
    () => ensayosOrdenados.filter((e) => e.estado !== "ejecutando"),
    [ensayosOrdenados],
  );

  const totalPages = Math.ceil(ensayosNoEjecutando.length / PAGE_SIZE);
  const ensayosPaginados = ensayosNoEjecutando.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  // Silent data loader
  const cargarDatosSilencioso = useCallback(async (id: number) => {
    try {
      const result = await tauriCmd.cargarDatosEnsayo(id);
      setDatos(result);
    } catch {
      // Silent fail
    }
  }, []);

  const handleSeleccionar = async (id: number) => {
    setSeleccionado(id);
    setExportError(null);
    setLoadingInicial(true);
    try {
      const result = await tauriCmd.cargarDatosEnsayo(id);
      setDatos(result);
      // Reset rango to full range
      setRangoCota({
        inicio: 0,
        fin: Math.max(0, result.timestamps.length - 1),
      });
    } catch {
      setDatos(null);
    } finally {
      setLoadingInicial(false);
    }
  };

  // Auto-refresh every 5s for running ensayos
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (refreshRef.current) {
      clearInterval(refreshRef.current);
      refreshRef.current = null;
    }
    if (!seleccionado) return;
    const ens = ensayos.find((e) => e.id === seleccionado);
    if (ens?.estado === "ejecutando") {
      refreshRef.current = setInterval(() => {
        cargarDatosSilencioso(seleccionado);
      }, 5000);
    }
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [seleccionado, ensayos, cargarDatosSilencioso]);

  // Update rango.fin when new data arrives (for running ensayos)
  useEffect(() => {
    if (datos && datos.timestamps.length > 0) {
      const maxIdx = datos.timestamps.length - 1;
      // Only auto-extend fin if it was already at the end
      setRangoCota((prev) => {
        if (prev.fin >= maxIdx - 1 || prev.fin === 0) {
          return { ...prev, fin: maxIdx };
        }
        return prev;
      });
    }
  }, [datos]);

  const handleEliminar = async (id: number) => {
    if (!confirm("¿Eliminar este ensayo y su archivo CSV?")) return;
    try {
      await tauriCmd.eliminarEnsayo(id);
      await cargarEnsayos();
      if (seleccionado === id) {
        setSeleccionado(null);
        setDatos(null);
      }
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDetener = async (id: number) => {
    try {
      await tauriCmd.detenerAdquisicion(id);
      await cargarEnsayos();
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleIniciar = async (id: number) => {
    try {
      await tauriCmd.iniciarAdquisicion(id);
      await cargarEnsayos();
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
    }
  };

  // Export only data within the selected range
  const handleExportarRango = async () => {
    if (!seleccionado || !datos) return;
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const destino = await save({
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      if (!destino) return;

      await tauriCmd.exportarCsvRango(
        seleccionado,
        destino,
        rangoCota.inicio,
        rangoCota.fin,
      );
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
    }
  };

  // All lecturas from CSV (with energy tare)
  const lecturas: LecturaInstante[] = useMemo(() => {
    if (!datos) return [];
    const dataCols = datos.cabeceras.filter(
      (h) => h !== "id" && h !== "fecha_hora",
    );

    const energyTaras: Record<string, number | null> = {};
    for (const col of dataCols) {
      const parts = col.split("_");
      const variable = parts[1]?.toUpperCase() ?? "";
      if (
        variable.startsWith("E") &&
        variable !== "E" &&
        col.startsWith("JTZA")
      ) {
        const colIdx = dataCols.indexOf(col);
        let tara: number | null = null;
        for (const fila of datos.filas) {
          const val = fila[colIdx];
          if (val != null) {
            tara = val;
            break;
          }
        }
        energyTaras[col] = tara;
      }
    }

    return datos.timestamps.map((ts, i) => ({
      id: i + 1,
      timestamp: ts,
      valores: dataCols.map((col, colIdx) => {
        let valor = datos.filas[i]?.[colIdx] ?? null;
        if (col in energyTaras && valor != null && energyTaras[col] != null) {
          valor = valor - energyTaras[col]!;
        }
        return {
          columna: col,
          valor,
          unidad: col.startsWith("ADAM") ? "°C" : "",
        };
      }),
    }));
  }, [datos]);

  // Lecturas filtered by rango (for statistics and graphs)
  const lecturasEnRango = useMemo(() => {
    return lecturas.slice(rangoCota.inicio, rangoCota.fin + 1);
  }, [lecturas, rangoCota]);

  // Statistics only from the rango
  const estadisticas = useEstadisticas(lecturasEnRango);

  // Last reading (for instantaneous panel)
  const ultimaLectura =
    lecturas.length > 0 ? lecturas[lecturas.length - 1] : null;

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
    if (!fin) return "en curso";
    const ms = new Date(fin).getTime() - new Date(inicio).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    return `${h}h ${min % 60}m`;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Ensayos</h1>

      {/* 1. Collapsible history table */}
      <CollapsibleSection
        title="Historial de ensayos"
        defaultOpen={false}
        badge={`${ensayosNoEjecutando.length} ensayos`}
      >
        <div className="overflow-x-auto">
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
                <th className="text-left px-3 py-2 font-medium text-gray-600">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {ensayosPaginados.map((ens) => (
                <tr
                  key={ens.id}
                  onClick={() => handleSeleccionar(ens.id)}
                  className={`border-b cursor-pointer hover:bg-blue-50 ${seleccionado === ens.id ? "bg-blue-50" : ""}`}
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
                  <td className="px-3 py-2 space-x-2">
                    {ens.estado === "creado" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleIniciar(ens.id);
                        }}
                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                      >
                        Iniciar
                      </button>
                    )}
                    {(ens.estado === "finalizado" ||
                      ens.estado === "error") && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEliminar(ens.id);
                        }}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ensayosNoEjecutando.length === 0 && (
            <p className="p-4 text-sm text-gray-400">
              No hay ensayos en el historial
            </p>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50">
              <span className="text-xs text-gray-500">
                Pág. {page + 1}/{totalPages} ({ensayosNoEjecutando.length}{" "}
                ensayos)
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-2 py-1 text-xs border rounded disabled:opacity-40 hover:bg-gray-100"
                >
                  ← Ant
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  className="px-2 py-1 text-xs border rounded disabled:opacity-40 hover:bg-gray-100"
                >
                  Sig →
                </button>
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* 2. Running ensayos — always visible as compact cards + timer */}
      {ensayosEjecutando.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-green-700">
            ● Ensayos en ejecución
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {/* Ensayo cards */}
            <div className="space-y-2">
              {ensayosEjecutando.map((ens) => (
                <div
                  key={ens.id}
                  onClick={() => handleSeleccionar(ens.id)}
                  className={`flex items-center justify-between gap-2 p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors ${seleccionado === ens.id ? "ring-2 ring-green-400" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {ens.nombre}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge estado={ens.estado} />
                      <span className="text-xs text-gray-500">
                        {new Date(ens.fecha_hora_inicio).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDetener(ens.id);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-100 border border-orange-300 rounded hover:bg-orange-200 shrink-0"
                  >
                    Detener
                  </button>
                </div>
              ))}
            </div>
            {/* Timer card — separate */}
            <div>
              <CountdownTimer onFinish={handleTimerFinish} />
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {exportError && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {exportError}
        </div>
      )}

      {/* Detail section */}
      {seleccionado && (
        <div className="space-y-3">
          {ensayoSeleccionado?.estado === "error" && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              ⚠️ Ensayo finalizado de forma anormal — datos parciales
              disponibles
            </div>
          )}
          {ensayoSeleccionado?.estado === "ejecutando" && (
            <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
              ● Adquiriendo datos — actualización automática cada 5s
            </div>
          )}

          {loadingInicial && (
            <p className="text-sm text-gray-500">Cargando datos...</p>
          )}

          {datos && (
            <>
              {/* 1. Instantaneous values */}
              <CollapsibleSection
                title="Valores Instantáneos"
                defaultOpen={true}
                badge={
                  ultimaLectura
                    ? new Date(ultimaLectura.timestamp).toLocaleTimeString()
                    : ""
                }
              >
                <PanelInstantaneo
                  lectura={ultimaLectura}
                  aliases={ensayoSeleccionado?.aliases}
                />
              </CollapsibleSection>

              {/* 2. Temperature graph */}
              {columnasAdam.length > 0 && (
                <CollapsibleSection
                  title="Gráfico de Temperatura"
                  defaultOpen={true}
                >
                  <GraficoTemperatura
                    lecturas={lecturasEnRango}
                    columnas={columnasAdam}
                    estadisticas={estadisticas}
                    aliases={ensayoSeleccionado?.aliases}
                  />
                </CollapsibleSection>
              )}

              {/* 3. Electrical graph */}
              {columnasJanitza.length > 0 && (
                <CollapsibleSection
                  title="Variables Eléctricas"
                  defaultOpen={true}
                >
                  <GraficoElectrico
                    lecturas={lecturasEnRango}
                    columnas={columnasJanitza}
                    estadisticas={estadisticas}
                    aliases={ensayoSeleccionado?.aliases}
                  />
                </CollapsibleSection>
              )}

              {/* 4. Cotas / Range control */}
              <CollapsibleSection
                title="Cotas y Rango de Análisis"
                defaultOpen={true}
              >
                <CotasControl
                  rango={rangoCota}
                  onRangoChange={setRangoCota}
                  totalLecturas={lecturas.length}
                  timestamps={datos.timestamps}
                />
              </CollapsibleSection>

              {/* 5. Statistics */}
              <CollapsibleSection
                title="Estadísticas"
                defaultOpen={true}
                badge={`${lecturasEnRango.length} lecturas en rango`}
              >
                <PanelEstadisticas
                  estadisticas={estadisticas}
                  aliases={ensayoSeleccionado?.aliases}
                />
              </CollapsibleSection>

              {/* 6. Export button */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleExportarRango}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Exportar CSV
                </button>
                <span className="text-xs text-gray-400">
                  {lecturasEnRango.length} lecturas en rango (de{" "}
                  {lecturas.length} total)
                </span>
                {exportError && (
                  <span className="text-xs text-red-600">{exportError}</span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {showTimerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center">
            <div className="text-4xl mb-3">⏰</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¡Tiempo cumplido!
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              El temporizador ha finalizado.
            </p>
            <button
              type="button"
              onClick={() => setShowTimerModal(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
