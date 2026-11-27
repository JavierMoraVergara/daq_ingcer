import type { Esquema, Instrumento } from "../../types";

const ETIQUETAS: Record<string, string> = {
  ADAM4118: "ADAM4118",
  JANITZA_UMG509: "Janitza UMG509",
  JANITZA_UMG503: "Janitza UMG503",
  METALTEX_MC62: "Metaltex MC62",
  ADL10_E: "ADL10-E",
};

/** Cuenta los instrumentos del esquema agrupados por tipo real. */
function contarPorTipo(
  esquema: Esquema,
  instrumentos: Instrumento[],
): [string, number][] {
  const ids = [
    ...esquema.instrumentos_adam,
    ...esquema.instrumentos_janitza,
    ...esquema.instrumentos_metaltex,
  ];
  const conteo = new Map<string, number>();
  for (const id of ids) {
    const tipo = instrumentos.find((i) => i.id === id)?.tipo;
    const etiqueta = tipo ? (ETIQUETAS[tipo] ?? tipo) : "Desconocido";
    conteo.set(etiqueta, (conteo.get(etiqueta) ?? 0) + 1);
  }
  return Array.from(conteo.entries());
}

interface EsquemaCardProps {
  esquema: Esquema;
  instrumentos: Instrumento[];
  onCrearEnsayo: (esquema: Esquema) => void;
  onEditar: (esquema: Esquema) => void;
  onDeshabilitar: (esquema: Esquema) => void;
}

export function EsquemaCard({
  esquema,
  instrumentos,
  onCrearEnsayo,
  onEditar,
  onDeshabilitar,
}: EsquemaCardProps) {
  const porTipo = contarPorTipo(esquema, instrumentos);
  const totalInstrumentos = porTipo.reduce((a, [, n]) => a + n, 0);

  return (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900">
          {esquema.nombre}
        </h3>
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${
            esquema.vigente
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {esquema.vigente ? "Vigente" : "Deshabilitado"}
        </span>
      </div>

      {esquema.descripcion && (
        <p className="text-sm text-gray-600 mb-3">{esquema.descripcion}</p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mb-4">
        <span>Instrumentos: {totalInstrumentos}</span>
        {porTipo.map(([etiqueta, n]) => (
          <span key={etiqueta}>
            {etiqueta}: {n}
          </span>
        ))}
        <span>v{esquema.version}</span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onCrearEnsayo(esquema)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Crear Ensayo
        </button>
        <button
          type="button"
          onClick={() => onEditar(esquema)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => onDeshabilitar(esquema)}
          className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
        >
          Deshabilitar
        </button>
      </div>
    </div>
  );
}
