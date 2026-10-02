import { useEffect, useState } from "react";
import { tauriCmd } from "../../lib/tauriCommands";
import type { Instrumento } from "../../types";
import { CollapsibleSection } from "../shared/CollapsibleSection";

interface ControlSetValueProps {
  esquemaId: number;
}

/**
 * Permite ajustar el Set Value (SV) de los controladores Metaltex MC62
 * de un esquema mientras el ensayo está en ejecución.
 */
export function ControlSetValue({ esquemaId }: ControlSetValueProps) {
  const [controladores, setControladores] = useState<Instrumento[]>([]);
  const [valores, setValores] = useState<Record<number, string>>({});
  const [estados, setEstados] = useState<Record<number, string>>({});

  useEffect(() => {
    const cargar = async () => {
      try {
        const esquemas = await tauriCmd.listarEsquemas();
        const esquema = esquemas.find((e) => e.id === esquemaId);
        if (!esquema) return;

        const instrumentos = await tauriCmd.listarInstrumentos();
        const mc62 = instrumentos.filter(
          (i) =>
            i.tipo === "METALTEX_MC62" &&
            esquema.instrumentos_metaltex.includes(i.id),
        );
        setControladores(mc62);
      } catch {
        // silent
      }
    };
    cargar();
  }, [esquemaId]);

  const enviar = async (inst: Instrumento) => {
    const valor = parseFloat(valores[inst.id] ?? "");
    if (Number.isNaN(valor)) {
      setEstados({ ...estados, [inst.id]: "Valor inválido" });
      return;
    }
    setEstados({ ...estados, [inst.id]: "Enviando..." });
    try {
      await tauriCmd.escribirSvMetaltex(
        inst.direccion_ip,
        inst.puerto,
        inst.slave_id,
        2000,
        valor,
      );
      setEstados({ ...estados, [inst.id]: `SV = ${valor} °C enviado ✓` });
    } catch (e) {
      setEstados({ ...estados, [inst.id]: `Error: ${String(e)}` });
    }
  };

  if (controladores.length === 0) return null;

  return (
    <CollapsibleSection
      title="Ajuste de Set Value (Metaltex MC62)"
      defaultOpen={true}
    >
      <div className="space-y-3">
        {controladores.map((inst) => (
          <div
            key={inst.id}
            className="flex items-center gap-3 flex-wrap p-2 border border-gray-200 rounded"
          >
            <span className="text-sm font-medium text-gray-700 min-w-32">
              {inst.nombre || `MC62 #${inst.id}`}
            </span>
            <input
              type="number"
              step="0.1"
              placeholder="Temp. °C"
              value={valores[inst.id] ?? ""}
              onChange={(e) =>
                setValores({ ...valores, [inst.id]: e.target.value })
              }
              className="px-2 py-1 border border-gray-300 rounded text-sm w-28"
            />
            <button
              type="button"
              onClick={() => enviar(inst)}
              className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Enviar SV
            </button>
            {estados[inst.id] && (
              <span className="text-xs text-gray-600">{estados[inst.id]}</span>
            )}
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}
