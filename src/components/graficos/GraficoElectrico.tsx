import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { LecturaInstante, AliasMap } from "../../types";
import type { CotasConfig } from "./CotasControl";
import type { Estadisticas } from "../../lib/estadisticas";

const LINE_COLORS = [
  "#7c3aed",
  "#059669",
  "#d97706",
  "#db2777",
  "#0284c7",
  "#4f46e5",
  "#b91c1c",
  "#15803d",
];

const TABS = [
  { key: "V", label: "Voltaje" },
  { key: "C", label: "Corriente" },
  { key: "P", label: "Potencia" },
  { key: "E", label: "Energía" },
  { key: "FP", label: "FP" },
  { key: "F", label: "Freq" },
];

interface GraficoElectricoProps {
  lecturas: LecturaInstante[];
  columnas: string[];
  estadisticas?: Map<string, Estadisticas>;
  cotas?: CotasConfig;
  aliases?: AliasMap;
}

export function GraficoElectrico({
  lecturas,
  columnas,
  estadisticas,
  cotas,
  aliases = {},
}: GraficoElectricoProps) {
  const [tabActivo, setTabActivo] = useState("V");

  const columnasActivas = useMemo(() => {
    return columnas.filter((col) => {
      // Column format: JTZA{n}_{variable} or JTZA{n}_{variable}_{alias}
      const parts = col.split("_");
      // parts[0] = "JTZA1", parts[1] = variable, parts[2+] = alias
      const variable = parts[1]?.toUpperCase() ?? "";

      if (tabActivo === "V") return variable.startsWith("V");
      if (tabActivo === "C") return variable.startsWith("C");
      if (tabActivo === "P")
        return variable.startsWith("P") && !variable.startsWith("PF");
      if (tabActivo === "E") return variable.startsWith("E");
      if (tabActivo === "FP") return variable.startsWith("FP");
      if (tabActivo === "F") return variable === "F";
      return false;
    });
  }, [columnas, tabActivo]);

  const data = useMemo(() => {
    return lecturas.map((l) => {
      const point: Record<string, string | number | null> = {
        time: new Date(l.timestamp).toLocaleTimeString(),
      };
      for (const col of columnasActivas) {
        const val = l.valores.find((v) => v.columna === col);
        point[col] = val?.valor ?? null;
      }
      return point;
    });
  }, [lecturas, columnasActivas]);

  const referenceLines = useMemo(() => {
    if (!cotas || !estadisticas || columnasActivas.length === 0) return [];
    const lines: { value: number; label: string; color: string }[] = [];
    const firstCol = columnasActivas[0];
    const stats = estadisticas.get(firstCol);
    if (!stats) return lines;

    if (cotas.promedio && stats.promedio !== null)
      lines.push({
        value: stats.promedio,
        label: "Promedio",
        color: "#f59e0b",
      });
    if (cotas.mediana && stats.mediana !== null)
      lines.push({ value: stats.mediana, label: "Mediana", color: "#8b5cf6" });
    if (cotas.minimo && stats.minimo !== null)
      lines.push({ value: stats.minimo, label: "Mín", color: "#06b6d4" });
    if (cotas.maximo && stats.maximo !== null)
      lines.push({ value: stats.maximo, label: "Máx", color: "#ef4444" });
    if (
      cotas.desviacion_std &&
      stats.desviacion_std !== null &&
      stats.promedio !== null
    ) {
      lines.push({
        value: stats.promedio + stats.desviacion_std,
        label: "+Std",
        color: "#10b981",
      });
      lines.push({
        value: stats.promedio - stats.desviacion_std,
        label: "-Std",
        color: "#10b981",
      });
    }
    return lines;
  }, [cotas, estadisticas, columnasActivas]);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">
        Variables Eléctricas
      </h3>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTabActivo(tab.key)}
            className={`px-2 py-1 text-xs rounded ${
              tabActivo === tab.key
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {columnasActivas.length === 0 ? (
        <p className="text-xs text-gray-400 py-8 text-center">
          Sin datos para esta variable
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis
              tick={{ fontSize: 10 }}
              width={60}
              tickFormatter={(v: number) =>
                typeof v === "number" ? v.toFixed(1) : v
              }
            />
            <Tooltip
              formatter={(value: number) =>
                value != null ? value.toFixed(1) : value
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {columnasActivas.map((col, i) => (
              <Line
                key={col}
                type="monotone"
                dataKey={col}
                name={aliases[col] || col}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                dot={false}
                strokeWidth={1.5}
                connectNulls={false}
              />
            ))}
            {referenceLines.map((rl) => (
              <ReferenceLine
                key={rl.label}
                y={rl.value}
                label={{ value: rl.label, fontSize: 10, fill: rl.color }}
                stroke={rl.color}
                strokeDasharray="4 2"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
