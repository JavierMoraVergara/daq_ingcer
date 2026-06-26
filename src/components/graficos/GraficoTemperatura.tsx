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
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#0891b2",
  "#e11d48",
  "#65a30d",
];

interface GraficoTemperaturaProps {
  lecturas: LecturaInstante[];
  columnas: string[];
  estadisticas?: Map<string, Estadisticas>;
  cotas?: CotasConfig;
  aliases?: AliasMap;
  rangoY?: [number, number];
}

export function GraficoTemperatura({
  lecturas,
  columnas,
  estadisticas,
  cotas,
  aliases = {},
  rangoY,
}: GraficoTemperaturaProps) {
  const [escalaAuto, setEscalaAuto] = useState(true);

  const data = useMemo(() => {
    return lecturas.map((l) => {
      const point: Record<string, string | number | null> = {
        time: new Date(l.timestamp).toLocaleTimeString(),
      };
      for (const col of columnas) {
        const val = l.valores.find((v) => v.columna === col);
        point[col] = val?.valor ?? null;
      }
      return point;
    });
  }, [lecturas, columnas]);

  const domain = useMemo((): [number, number] | ["auto", "auto"] => {
    if (!escalaAuto && rangoY) return rangoY;
    if (data.length === 0) return ["auto", "auto"];

    let min = Infinity;
    let max = -Infinity;
    for (const point of data) {
      for (const col of columnas) {
        const v = point[col];
        if (typeof v === "number") {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }
    if (!isFinite(min)) return ["auto", "auto"];
    const margin = (max - min) * 0.1 || 1;
    return [min - margin, max + margin];
  }, [data, columnas, escalaAuto, rangoY]);

  const referenceLines = useMemo(() => {
    if (!cotas || !estadisticas) return [];
    const lines: { value: number; label: string; color: string }[] = [];
    const firstCol = columnas[0];
    if (!firstCol) return lines;
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
  }, [cotas, estadisticas, columnas]);

  if (columnas.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-sm text-gray-400">Sin columnas de temperatura</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">Temperatura (°C)</h3>
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={escalaAuto}
            onChange={(e) => setEscalaAuto(e.target.checked)}
            className="rounded"
          />
          Auto-escala
        </label>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="time" tick={{ fontSize: 10 }} />
          <YAxis
            domain={domain}
            tick={{ fontSize: 10 }}
            width={50}
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
          {columnas.map((col, i) => (
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
    </div>
  );
}
