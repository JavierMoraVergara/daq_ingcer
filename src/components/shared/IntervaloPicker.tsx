import { useState } from "react";

const PRESETS = [10, 30, 60, 120, 300, 600];

interface IntervaloPickerProps {
  value: number;
  onChange: (seconds: number) => void;
}

export function IntervaloPicker({ value, onChange }: IntervaloPickerProps) {
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handlePreset = (seconds: number) => {
    setError(null);
    setCustom("");
    onChange(seconds);
  };

  const handleCustom = (input: string) => {
    setCustom(input);
    const num = parseInt(input, 10);
    if (isNaN(num)) {
      setError("Ingrese un número válido");
      return;
    }
    if (num < 10 || num > 600) {
      setError("El intervalo debe estar entre 10 y 600 segundos");
      return;
    }
    setError(null);
    onChange(num);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Intervalo de muestreo (segundos)
      </label>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => handlePreset(s)}
            className={`px-3 py-1 rounded text-sm border ${
              value === s && !custom
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {s}s
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={10}
          max={600}
          placeholder="Personalizado"
          value={custom}
          onChange={(e) => handleCustom(e.target.value)}
          className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
        />
        <span className="text-xs text-gray-500">10–600s</span>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
