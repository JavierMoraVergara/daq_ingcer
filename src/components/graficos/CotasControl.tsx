export interface CotasConfig {
  promedio: boolean;
  mediana: boolean;
  minimo: boolean;
  maximo: boolean;
  desviacion_std: boolean;
}

export interface RangoCota {
  inicio: number;
  fin: number;
}

interface CotasControlProps {
  rango: RangoCota;
  onRangoChange: (rango: RangoCota) => void;
  totalLecturas: number;
  timestamps?: string[];
}

function formatTimestamp(ts: string | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function CotasControl({
  rango,
  onRangoChange,
  totalLecturas,
  timestamps,
}: CotasControlProps) {
  const max = Math.max(0, totalLecturas - 1);

  return (
    <div className="space-y-4">
      {/* Dual range slider */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-600">
            Rango de análisis
          </span>
          <button
            type="button"
            onClick={() => onRangoChange({ inicio: 0, fin: max })}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Resetear
          </button>
        </div>

        {max > 0 ? (
          <div className="relative pt-2 pb-6">
            {/* Track background */}
            <div className="relative h-2 bg-gray-200 rounded">
              {/* Filled section between handles */}
              <div
                className="absolute h-2 bg-blue-400 rounded"
                style={{
                  left: `${(rango.inicio / max) * 100}%`,
                  width: `${((rango.fin - rango.inicio) / max) * 100}%`,
                }}
              />
            </div>
            {/* Two overlapping range inputs */}
            <input
              type="range"
              min={0}
              max={max}
              value={rango.inicio}
              onChange={(e) =>
                onRangoChange({
                  ...rango,
                  inicio: Math.min(Number(e.target.value), rango.fin - 1),
                })
              }
              className="absolute top-0 w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
            />
            <input
              type="range"
              min={0}
              max={max}
              value={rango.fin}
              onChange={(e) =>
                onRangoChange({
                  ...rango,
                  fin: Math.max(Number(e.target.value), rango.inicio + 1),
                })
              }
              className="absolute top-0 w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
            />
            {/* Time labels */}
            <div className="flex justify-between mt-3 text-xs text-gray-500">
              <span>
                {timestamps
                  ? formatTimestamp(timestamps[rango.inicio])
                  : `#${rango.inicio}`}
              </span>
              <span className="text-gray-400">
                {rango.fin - rango.inicio + 1} lecturas seleccionadas
              </span>
              <span>
                {timestamps
                  ? formatTimestamp(timestamps[rango.fin])
                  : `#${rango.fin}`}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 py-2">Sin datos disponibles</p>
        )}
      </div>
    </div>
  );
}
