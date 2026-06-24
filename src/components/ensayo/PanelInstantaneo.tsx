import type { LecturaInstante, AliasMap } from "../../types";

interface PanelInstantaneoProps {
  lectura: LecturaInstante | null;
  aliases?: AliasMap;
}

export function PanelInstantaneo({
  lectura,
  aliases = {},
}: PanelInstantaneoProps) {
  if (!lectura) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-2">
          Lectura Instantánea
        </h3>
        <p className="text-xs text-gray-400">Sin datos</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-600 mb-2">
        Lectura Instantánea
        <span className="ml-2 text-xs text-gray-400">
          {new Date(lectura.timestamp).toLocaleTimeString()}
        </span>
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {lectura.valores.map((v) => {
          const nombre = aliases[v.columna] || v.columna;
          const isNull = v.valor === null;
          return (
            <div
              key={v.columna}
              className={`px-2 py-1.5 rounded border text-xs ${
                isNull ? "border-red-200 bg-red-50" : "border-gray-200"
              }`}
            >
              <div className="text-gray-500 truncate" title={v.columna}>
                {nombre}
              </div>
              <div
                className={`font-mono font-medium ${isNull ? "text-red-600" : "text-gray-900"}`}
              >
                {isNull ? "NULL" : `${v.valor!.toFixed(2)} ${v.unidad}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
