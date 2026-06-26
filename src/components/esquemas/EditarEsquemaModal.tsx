import { useState } from "react";
import { useEsquemasStore } from "../../store/useEsquemasStore";
import { tauriCmd } from "../../lib/tauriCommands";
import type { Esquema } from "../../types";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarEsquemas = useEsquemasStore((s) => s.cargarEsquemas);

  const handleGuardar = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await tauriCmd.actualizarEsquema(esquema.id, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
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
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-4">Editar Esquema</h2>

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
              rows={3}
              placeholder="Descripción del esquema"
            />
          </div>

          <div className="bg-gray-50 rounded p-3 text-xs text-gray-500 space-y-1">
            <p>
              <strong>Instrumentos ADAM:</strong>{" "}
              {esquema.cant_adam || esquema.instrumentos_adam.length}
            </p>
            <p>
              <strong>Instrumentos Janitza:</strong>{" "}
              {esquema.cant_janitzas || esquema.instrumentos_janitza.length}
            </p>
            <p className="text-gray-400 italic">
              La edición de instrumentos no está disponible en esta versión.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
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
              disabled={saving || !nombre.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
