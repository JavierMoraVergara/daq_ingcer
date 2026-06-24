export interface CotasConfig {
  promedio: boolean;
  mediana: boolean;
  minimo: boolean;
  maximo: boolean;
  desviacion_std: boolean;
}

interface CotasControlProps {
  config: CotasConfig;
  onChange: (config: CotasConfig) => void;
}

const COTAS: { key: keyof CotasConfig; label: string }[] = [
  { key: "promedio", label: "Promedio" },
  { key: "mediana", label: "Mediana" },
  { key: "minimo", label: "Mínimo" },
  { key: "maximo", label: "Máximo" },
  { key: "desviacion_std", label: "Desv. Std" },
];

export function CotasControl({ config, onChange }: CotasControlProps) {
  const toggle = (key: keyof CotasConfig) => {
    onChange({ ...config, [key]: !config[key] });
  };

  return (
    <div className="bg-white rounded-lg shadow p-3">
      <h4 className="text-xs font-medium text-gray-600 mb-2">
        Cotas de control
      </h4>
      <div className="flex flex-wrap gap-3">
        {COTAS.map(({ key, label }) => (
          <label
            key={key}
            className="flex items-center gap-1.5 text-xs text-gray-700"
          >
            <input
              type="checkbox"
              checked={config[key]}
              onChange={() => toggle(key)}
              className="rounded"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
