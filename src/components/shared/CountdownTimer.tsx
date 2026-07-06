import { useState, useEffect, useRef } from "react";

interface CountdownTimerProps {
  onFinish: () => void;
}

export function CountdownTimer({ onFinish }: CountdownTimerProps) {
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [active, setActive] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = days * 86400 + hours * 3600 + minutes * 60;

  const start = () => {
    if (totalSeconds <= 0) return;
    setRemaining(totalSeconds);
    setActive(true);
  };

  const cancel = () => {
    setActive(false);
    setRemaining(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  useEffect(() => {
    if (!active) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setActive(false);
          onFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, onFinish]);

  const formatRemaining = () => {
    const d = Math.floor(remaining / 86400);
    const h = Math.floor((remaining % 86400) / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;
    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  if (active) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⏱</span>
          <div>
            <p className="text-xs text-orange-600 font-medium">
              Temporizador activo
            </p>
            <p className="text-xl font-mono font-bold text-orange-800">
              {formatRemaining()}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={cancel}
          className="px-3 py-1.5 text-sm border border-orange-300 text-orange-700 rounded hover:bg-orange-100"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <p className="text-xs font-medium text-blue-700 mb-3">⏱ Temporizador</p>
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Días</label>
          <input
            type="number"
            min={0}
            max={30}
            value={days}
            onChange={(e) => setDays(Math.max(0, Number(e.target.value)))}
            className="w-16 px-2 py-2 border border-gray-300 rounded text-center text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Horas</label>
          <input
            type="number"
            min={0}
            max={23}
            value={hours}
            onChange={(e) =>
              setHours(Math.max(0, Math.min(23, Number(e.target.value))))
            }
            className="w-16 px-2 py-2 border border-gray-300 rounded text-center text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Minutos</label>
          <input
            type="number"
            min={0}
            max={59}
            value={minutes}
            onChange={(e) =>
              setMinutes(Math.max(0, Math.min(59, Number(e.target.value))))
            }
            className="w-16 px-2 py-2 border border-gray-300 rounded text-center text-sm font-mono"
          />
        </div>
        <button
          type="button"
          onClick={start}
          disabled={totalSeconds === 0}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
        >
          Iniciar
        </button>
      </div>
    </div>
  );
}
