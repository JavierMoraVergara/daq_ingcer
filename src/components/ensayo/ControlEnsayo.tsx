import { useState, useEffect, useRef } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { RegistroEnsayo } from "../../types";
import { useEnsayoStore } from "../../store/useEnsayoStore";

interface ControlEnsayoProps {
  ensayo: RegistroEnsayo;
}

export function ControlEnsayo({ ensayo }: ControlEnsayoProps) {
  const [elapsed, setElapsed] = useState(0);
  const [allFailed, setAllFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const iniciarAdquisicion = useEnsayoStore((s) => s.iniciarAdquisicion);
  const detenerAdquisicion = useEnsayoStore((s) => s.detenerAdquisicion);

  const isCreado = ensayo.estado === "creado";
  const isEjecutando = ensayo.estado === "ejecutando";

  useEffect(() => {
    if (isEjecutando) {
      const start = new Date(ensayo.fecha_hora_inicio).getTime();
      const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      setElapsed(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isEjecutando, ensayo.fecha_hora_inicio]);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    listen<void>("error_todos_instrumentos", () => {
      setAllFailed(true);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  const formatTime = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleIniciar = async () => {
    setAllFailed(false);
    await iniciarAdquisicion(ensayo.id);
  };

  const handleDetener = async () => {
    await detenerAdquisicion(ensayo.id);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleIniciar}
          disabled={!isCreado}
          className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Iniciar
        </button>
        <button
          type="button"
          onClick={handleDetener}
          disabled={!isEjecutando}
          className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Detener
        </button>

        {isEjecutando && (
          <span className="font-mono text-lg text-gray-800">
            ⏱ {formatTime(elapsed)}
          </span>
        )}
      </div>

      {allFailed && (
        <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded text-sm text-red-800">
          ⚠️ Todos los instrumentos fallaron en el último ciclo. Verifique las
          conexiones.
        </div>
      )}
    </div>
  );
}
