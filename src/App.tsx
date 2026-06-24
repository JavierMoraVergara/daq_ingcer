import { useEffect } from "react";
import { useUiStore } from "./store/useUiStore";
import { useEsquemasStore } from "./store/useEsquemasStore";
import { useEnsayoStore } from "./store/useEnsayoStore";
import { EsquemasView } from "./views/EsquemasView";
import { EnsayoView } from "./views/EnsayoView";
import { RevisarEnsayoView } from "./views/RevisarEnsayoView";

const NAV_ITEMS = [
  { key: "esquemas" as const, label: "Esquemas", icon: "📋" },
  { key: "ensayo" as const, label: "En curso", icon: "▶️" },
  { key: "revisar" as const, label: "Ensayos", icon: "📊" },
  { key: "configuracion" as const, label: "Config", icon: "⚙️" },
];

function App() {
  const vistaActual = useUiStore((s) => s.vistaActual);
  const setVista = useUiStore((s) => s.setVista);
  const ensayoActivo = useEnsayoStore((s) => s.ensayoActivo);
  const cargarEsquemas = useEsquemasStore((s) => s.cargarEsquemas);
  const cargarEnsayos = useEnsayoStore((s) => s.cargarEnsayos);

  useEffect(() => {
    cargarEsquemas();
    cargarEnsayos();
  }, [cargarEsquemas, cargarEnsayos]);

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold">DAQ Ingcer</h1>
          <p className="text-xs text-gray-400">Sistema de adquisición</p>
        </div>
        <nav className="flex-1 py-2">
          {NAV_ITEMS.map((item) => {
            // Hide "En curso" if no active essay
            if (item.key === "ensayo" && !ensayoActivo) return null;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setVista(item.key)}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                  vistaActual === item.key
                    ? "bg-gray-700 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-700 text-xs text-gray-500">
          v0.1.0
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {vistaActual === "esquemas" && <EsquemasView />}
        {vistaActual === "ensayo" && <EnsayoView />}
        {vistaActual === "revisar" && <RevisarEnsayoView />}
        {vistaActual === "configuracion" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
            <p className="text-sm text-gray-500">
              Configuración general del sistema. (En desarrollo)
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
