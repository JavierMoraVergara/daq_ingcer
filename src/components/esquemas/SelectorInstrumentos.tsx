import { useState } from "react";
import type { TipoInstrumento } from "../../types";
import { tauriCmd } from "../../lib/tauriCommands";

const ADAM_CANALES = [1, 2, 3, 4, 5, 6, 7, 8];
const JANITZA_VARIABLES = [
  "v1",
  "v2",
  "v3",
  "c1",
  "c2",
  "c3",
  "p1",
  "p2",
  "p3",
  "s1",
  "s2",
  "s3",
  "q1",
  "q2",
  "q3",
  "f",
  "pf1",
  "pf2",
  "pf3",
];

export interface InstrumentoConfig {
  tipo: TipoInstrumento;
  nombre: string;
  direccion_ip: string;
  puerto: number;
  slave_id: number;
  canales: (number | string)[];
}

interface SelectorInstrumentosProps {
  instrumentos: InstrumentoConfig[];
  onChange: (instrumentos: InstrumentoConfig[]) => void;
}

export function SelectorInstrumentos({
  instrumentos,
  onChange,
}: SelectorInstrumentosProps) {
  const [testResults, setTestResults] = useState<
    Record<number, boolean | null>
  >({});

  const addInstrumento = (tipo: TipoInstrumento) => {
    const nuevo: InstrumentoConfig = {
      tipo,
      nombre: "",
      direccion_ip: "",
      puerto: 502,
      slave_id: 1,
      canales: [],
    };
    onChange([...instrumentos, nuevo]);
  };

  const updateInstrumento = (
    index: number,
    updates: Partial<InstrumentoConfig>,
  ) => {
    const copy = [...instrumentos];
    copy[index] = { ...copy[index], ...updates };
    onChange(copy);
  };

  const removeInstrumento = (index: number) => {
    onChange(instrumentos.filter((_, i) => i !== index));
  };

  const toggleCanal = (index: number, canal: number | string) => {
    const inst = instrumentos[index];
    const canales = inst.canales.includes(canal)
      ? inst.canales.filter((c) => c !== canal)
      : [...inst.canales, canal];
    updateInstrumento(index, { canales });
  };

  const probarConexion = async (index: number) => {
    const inst = instrumentos[index];
    try {
      const ok = await tauriCmd.probarConexion(
        inst.direccion_ip,
        inst.puerto,
        inst.slave_id,
        2000,
      );
      setTestResults({ ...testResults, [index]: ok });
    } catch {
      setTestResults({ ...testResults, [index]: false });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => addInstrumento("ADAM4118")}
          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
        >
          + ADAM4118
        </button>
        <button
          type="button"
          onClick={() => addInstrumento("JANITZA_UMG509")}
          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          + Janitza UMG509
        </button>
      </div>

      {instrumentos.map((inst, idx) => (
        <div key={idx} className="border border-gray-200 rounded p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {inst.tipo === "ADAM4118" ? "ADAM4118" : "Janitza UMG509"} #
              {idx + 1}
            </span>
            <button
              type="button"
              onClick={() => removeInstrumento(idx)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Eliminar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Nombre"
              value={inst.nombre}
              onChange={(e) =>
                updateInstrumento(idx, { nombre: e.target.value })
              }
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <input
              placeholder="IP (ej: 192.168.1.10)"
              value={inst.direccion_ip}
              onChange={(e) =>
                updateInstrumento(idx, { direccion_ip: e.target.value })
              }
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <input
              type="number"
              placeholder="Puerto"
              value={inst.puerto}
              onChange={(e) =>
                updateInstrumento(idx, { puerto: Number(e.target.value) })
              }
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <input
              type="number"
              placeholder="Slave ID"
              value={inst.slave_id}
              onChange={(e) =>
                updateInstrumento(idx, { slave_id: Number(e.target.value) })
              }
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Canales:</p>
            <div className="flex flex-wrap gap-1">
              {(inst.tipo === "ADAM4118"
                ? ADAM_CANALES
                : JANITZA_VARIABLES
              ).map((canal) => (
                <label key={canal} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={inst.canales.includes(canal)}
                    onChange={() => toggleCanal(idx, canal)}
                    className="rounded"
                  />
                  {canal}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => probarConexion(idx)}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              Probar Conexión
            </button>
            {testResults[idx] === true && (
              <span className="text-xs text-green-600">✓ Conectado</span>
            )}
            {testResults[idx] === false && (
              <span className="text-xs text-red-600">✗ Fallo conexión</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
