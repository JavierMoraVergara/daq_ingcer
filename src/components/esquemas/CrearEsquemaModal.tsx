import { useState } from "react";
import {
  SelectorInstrumentos,
  type InstrumentoConfig,
} from "./SelectorInstrumentos";
import { useEsquemasStore } from "../../store/useEsquemasStore";
import { useUiStore } from "../../store/useUiStore";
import type { CanalesADAM, CanalesJanitza } from "../../types";

type Step = 1 | 2 | 3;

export function CrearEsquemaModal() {
  const [step, setStep] = useState<Step>(1);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [instrumentos, setInstrumentos] = useState<InstrumentoConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crearEsquema = useEsquemasStore((s) => s.crearEsquema);
  const cerrarModal = useUiStore((s) => s.cerrarModal);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const adams = instrumentos.filter((i) => i.tipo === "ADAM4118");
      const janitzas = instrumentos.filter((i) => i.tipo === "JANITZA_UMG509");

      const canales_adam: CanalesADAM = {};
      adams.forEach((a, idx) => {
        canales_adam[`canales_${idx + 1}`] = a.canales as number[];
      });

      const canales_janitzas: CanalesJanitza = {};
      janitzas.forEach((j, idx) => {
        canales_janitzas[`canales_${idx + 1}`] = j.canales as string[];
      });

      await crearEsquema({
        nombre,
        descripcion,
        instrumentos_adam: adams.map((_, idx) => idx + 1),
        canales_adam,
        instrumentos_janitza: janitzas.map((_, idx) => idx + 1),
        canales_janitzas,
      });

      cerrarModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-semibold mb-4">Nuevo Esquema</h2>

        {/* Step indicator */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded ${
                s <= step ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
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
                className="w-full px-3 py-2 border border-gray-300 rounded"
                rows={3}
                placeholder="Descripción opcional"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!nombre.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <SelectorInstrumentos
              instrumentos={instrumentos}
              onChange={setInstrumentos}
            />
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={instrumentos.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-800">Confirmar esquema</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>Nombre:</strong> {nombre}
              </p>
              <p>
                <strong>Descripción:</strong> {descripcion || "—"}
              </p>
              <p>
                <strong>Instrumentos:</strong> {instrumentos.length}
              </p>
              <ul className="ml-4 list-disc">
                {instrumentos.map((inst, i) => (
                  <li key={i}>
                    {inst.tipo} — {inst.nombre || "(sin nombre)"} —{" "}
                    {inst.canales.length} canales
                  </li>
                ))}
              </ul>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Crear Esquema"}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={cerrarModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
        >
          ×
        </button>
      </div>
    </div>
  );
}
