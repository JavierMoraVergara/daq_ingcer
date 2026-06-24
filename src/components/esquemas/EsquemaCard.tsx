import type { Esquema } from "../../types";

interface EsquemaCardProps {
  esquema: Esquema;
  onCrearEnsayo: (esquema: Esquema) => void;
  onEditar: (esquema: Esquema) => void;
  onDeshabilitar: (esquema: Esquema) => void;
}

export function EsquemaCard({
  esquema,
  onCrearEnsayo,
  onEditar,
  onDeshabilitar,
}: EsquemaCardProps) {
  const totalInstrumentos = esquema.cant_adam + esquema.cant_janitzas;

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

      <div className="flex gap-4 text-sm text-gray-500 mb-4">
        <span>Instrumentos: {totalInstrumentos}</span>
        <span>ADAM: {esquema.cant_adam}</span>
        <span>Janitza: {esquema.cant_janitzas}</span>
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
