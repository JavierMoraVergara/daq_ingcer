import { useState } from "react";
import type { LecturaInstante, AliasMap } from "../../types";

interface PanelInstantaneoProps {
  lectura: LecturaInstante | null;
  aliases?: AliasMap;
}

export function PanelInstantaneo({
  lectura,
  aliases = {},
}: PanelInstantaneoProps) {
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  if (!lectura) {
    return (
      <div>
        <p className="text-xs text-gray-400">Sin datos</p>
      </div>
    );
  }

  // Group values by instrument prefix (ADAM1, ADAM2, JTZA1, JTZA2, etc.)
  const groups = new Map<string, typeof lectura.valores>();
  for (const v of lectura.valores) {
    // Extract instrument prefix: "ADAM1_2_alias" -> "ADAM1", "JTZA1_V1_alias" -> "JTZA1"
    const parts = v.columna.split("_");
    const prefix = parts[0]; // ADAM1, JTZA1, etc.
    if (!groups.has(prefix)) {
      groups.set(prefix, []);
    }
    groups.get(prefix)!.push(v);
  }

  return (
    <div className="space-y-3">
      {Array.from(groups.entries()).map(([prefix, valores]) => (
        <div key={prefix}>
          <p className="text-xs font-medium text-gray-500 mb-1 uppercase">
            {prefix}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
            {valores.map((v) => {
              const nombre = aliases[v.columna] || v.columna;
              const isNull = v.valor === null;
              const isHighlighted = highlighted.has(v.columna);
              return (
                <div
                  key={v.columna}
                  onClick={() => {
                    const next = new Set(highlighted);
                    if (next.has(v.columna)) {
                      next.delete(v.columna);
                    } else {
                      next.add(v.columna);
                    }
                    setHighlighted(next);
                  }}
                  className={`px-2 py-1.5 rounded border text-xs cursor-pointer transition-all ${
                    isHighlighted
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-300"
                      : isNull
                        ? "border-red-200 bg-red-50"
                        : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div
                    className="text-gray-500 truncate text-[10px]"
                    title={v.columna}
                  >
                    {nombre}
                  </div>
                  <div
                    className={`font-mono font-medium ${isNull ? "text-red-600" : "text-gray-900"}`}
                  >
                    {isNull ? "NULL" : `${v.valor!.toFixed(1)} ${v.unidad}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
