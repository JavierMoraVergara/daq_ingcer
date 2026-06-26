import { useState, useMemo } from "react";
import { IntervaloPicker } from "../shared/IntervaloPicker";
import { AliasEditor } from "./AliasEditor";
import { useUiStore } from "../../store/useUiStore";
import { useEnsayoStore } from "../../store/useEnsayoStore";
import { tauriCmd } from "../../lib/tauriCommands";
import type { Esquema, AliasMap } from "../../types";

interface CrearEnsayoModalProps {
  esquema: Esquema;
}

export function CrearEnsayoModal({ esquema }: CrearEnsayoModalProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [intervalo, setIntervalo] = useState(60);
  const [aliases, setAliases] = useState<AliasMap>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cerrarModal = useUiStore((s) => s.cerrarModal);
  const setVista = useUiStore((s) => s.setVista);
  const cargarEnsayos = useEnsayoStore((s) => s.cargarEnsayos);
  const setEnsayoActivo = useEnsayoStore((s) => s.setEnsayoActivo);

  const columnas = useMemo(() => {
    const cols: string[] = [];
    for (let n = 1; n <= esquema.cant_adam; n++) {
      const key = `canales_${n}`;
      const canales = esquema.canales_adam[key];
      if (canales) {
        for (const canal of canales) {
          cols.push(`ADAM${n}_${canal}`);
        }
      }
    }
    for (let n = 1; n <= esquema.cant_janitzas; n++) {
      const key = `canales_${n}`;
      const variables = esquema.canales_janitzas[key];
      if (variables) {
        for (const v of variables) {
          cols.push(`JTZA${n}_${v.toUpperCase()}`);
        }
      }
    }
    return cols;
  }, [esquema]);

  const handleCrear = async () => {
    if (intervalo < 10 || intervalo > 600) {
      setError("El intervalo debe estar entre 10 y 600 segundos");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const ensayo = await tauriCmd.crearEnsayo({
        nombre,
        descripcion,
        esquema_id: esquema.id,
        intervalo_segundos: intervalo,
        aliases,
      });
      await cargarEnsayos();
      setEnsayoActivo(ensayo);
      cerrarModal();
      setVista("revisar");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg max-w-xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-semibold mb-4">Nuevo Ensayo</h2>
        <p className="text-sm text-gray-500 mb-4">
          Esquema: <strong>{esquema.nombre}</strong>
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              placeholder="Nombre del ensayo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              rows={2}
              placeholder="Descripción opcional"
            />
          </div>

          <IntervaloPicker value={intervalo} onChange={setIntervalo} />

          {columnas.length > 0 && (
            <AliasEditor
              columnas={columnas}
              aliases={aliases}
              onChange={setAliases}
            />
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={cerrarModal}
              className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCrear}
              disabled={saving || !nombre.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Creando..." : "Crear Ensayo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
