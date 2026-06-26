import type { Estadisticas } from "../../lib/estadisticas";
import type { AliasMap } from "../../types";

interface PanelEstadisticasProps {
  estadisticas: Map<string, Estadisticas>;
  aliases?: AliasMap;
}

const FILAS: { key: keyof Estadisticas; label: string }[] = [
  { key: "promedio", label: "Promedio" },
  { key: "mediana", label: "Mediana" },
  { key: "moda", label: "Moda" },
  { key: "desviacion_std", label: "Desv. Std" },
  { key: "minimo", label: "Mín" },
  { key: "maximo", label: "Máx" },
];

export function PanelEstadisticas({
  estadisticas,
  aliases = {},
}: PanelEstadisticasProps) {
  const columnas = Array.from(estadisticas.keys());

  if (columnas.length === 0) {
    return (
      <div>
        <p className="text-xs text-gray-400">Sin datos suficientes</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left px-2 py-1 font-medium text-gray-600">
              Métrica
            </th>
            {columnas.map((col) => (
              <th
                key={col}
                className="text-right px-2 py-1 font-medium text-gray-600 truncate max-w-[100px]"
                title={col}
              >
                {aliases[col] || col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FILAS.map(({ key, label }) => (
            <tr key={key} className="border-b border-gray-100">
              <td className="px-2 py-1 text-gray-700 font-medium">{label}</td>
              {columnas.map((col) => {
                const val = estadisticas.get(col)?.[key] ?? null;
                return (
                  <td
                    key={col}
                    className="text-right px-2 py-1 font-mono text-gray-800"
                  >
                    {val === null ? "—" : val.toFixed(1)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
