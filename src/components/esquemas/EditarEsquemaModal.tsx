import { useState, useEffect } from "react";
import { useEsquemasStore } from "../../store/useEsquemasStore";
import { tauriCmd } from "../../lib/tauriCommands";
import {
  SelectorInstrumentos,
  type InstrumentoConfig,
} from "./SelectorInstrumentos";
import type {
  Esquema,
  CanalesADAM,
  CanalesJanitza,
  Instrumento,
} from "../../types";

interface EditarEsquemaModalProps {
  esquema: Esquema;
  onClose: () => void;
}

export function EditarEsquemaModal({
  esquema,
  onClose,
}: EditarEsquemaModalProps) {
  const [nombre, setNombre] = useState(esquema.nombre);
  const [descripcion, setDescripcion] = useState(esquema.descripcion);
  const [instrumentos, setInstrumentos] = useState<InstrumentoConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const cargarEsquemas = useEsquemasStore((s) => s.cargarEsquemas);

  // Load existing instruments to pre-populate the selector
  useEffect(() => {
    const cargar = async () => {
      try {
        const allInstrumentos = await tauriCmd.listarInstrumentos();

        const configs: InstrumentoConfig[] = [];

        // Load ADAM instruments
        for (let i = 0; i < esquema.instrumentos_adam.length; i++) {
          const instId = esquema.instrumentos_adam[i];
          const inst = allInstrumentos.find(
            (x: Instrumento) => x.id === instId,
          );
          const key = `canales_${i + 1}`;
          const canales = esquema.canales_adam[key] || [];

          configs.push({
            tipo: "ADAM4118",
            nombre: inst?.nombre || `ADAM_${i + 1}`,
            direccion_ip: inst?.direccion_ip || "",
            puerto: inst?.puerto || 502,
            slave_id: inst?.slave_id || 1,
            canales: canales,
            tipo_termocupla: inst?.tipo_termocupla || "T",
          });
        }

        // Load Janitza instruments
        for (let i = 0; i < esquema.instrumentos_janitza.length; i++) {
          const instId = esquema.instrumentos_janitza[i];
          const inst = allInstrumentos.find(
            (x: Instrumento) => x.id === instId,
          );
          const key = `canales_${i + 1}`;
          const canales = esquema.canales_janitzas[key] || [];

          configs.push({
            tipo: "JANITZA_UMG509",
            nombre: inst?.nombre || `JTZA_${i + 1}`,
            direccion_ip: inst?.direccion_ip || "",
            puerto: inst?.puerto || 502,
            slave_id: inst?.slave_id || 1,
            canales: canales,
            tipo_termocupla: null,
          });
        }

        setInstrumentos(configs);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [esquema]);

  const handleGuardar = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const adams = instrumentos.filter((i) => i.tipo === "ADAM4118");
      const janitzas = instrumentos.filter((i) => i.tipo === "JANITZA_UMG509");

      // Create/update instruments in instrumentos.json
      const adamIds: number[] = [];
      for (const a of adams) {
        const inst = await tauriCmd.crearInstrumento({
          tipo: a.tipo,
          nombre: a.nombre || `ADAM_${adamIds.length + 1}`,
          direccion_ip: a.direccion_ip,
          puerto: a.puerto,
          slave_id: a.slave_id,
          timeout_ms: 2000,
          reintentos: 3,
          tipo_termocupla: a.tipo_termocupla,
        });
        adamIds.push(inst.id);
      }

      const janitzaIds: number[] = [];
      for (const j of janitzas) {
        const inst = await tauriCmd.crearInstrumento({
          tipo: j.tipo,
          nombre: j.nombre || `JTZA_${janitzaIds.length + 1}`,
          direccion_ip: j.direccion_ip,
          puerto: j.puerto,
          slave_id: j.slave_id,
          timeout_ms: 2000,
          reintentos: 3,
          tipo_termocupla: null,
        });
        janitzaIds.push(inst.id);
      }

      const canales_adam: CanalesADAM = {};
      adams.forEach((a, idx) => {
        canales_adam[`canales_${idx + 1}`] = a.canales as number[];
      });

      const canales_janitzas: CanalesJanitza = {};
      janitzas.forEach((j, idx) => {
        canales_janitzas[`canales_${idx + 1}`] = j.canales as string[];
      });

      await tauriCmd.actualizarEsquema(esquema.id, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        instrumentos_adam: adamIds,
        canales_adam,
        instrumentos_janitza: janitzaIds,
        canales_janitzas,
      });

      await cargarEsquemas();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Editar Esquema</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Cargando configuración...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                placeholder="Nombre del esquema"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                rows={2}
                placeholder="Descripción del esquema"
              />
            </div>

            <SelectorInstrumentos
              instrumentos={instrumentos}
              onChange={setInstrumentos}
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardar}
                disabled={saving || !nombre.trim() || instrumentos.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
