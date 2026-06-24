import type { EstadoEnsayo } from "../../types";

const colors: Record<EstadoEnsayo, string> = {
  creado: "bg-gray-200 text-gray-700",
  ejecutando: "bg-green-200 text-green-800 animate-pulse",
  finalizado: "bg-blue-200 text-blue-800",
  error: "bg-red-200 text-red-800",
};

export function StatusBadge({ estado }: { estado: EstadoEnsayo }) {
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${colors[estado]}`}
    >
      {estado}
    </span>
  );
}
