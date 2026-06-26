import { create } from "zustand";
import type { RegistroEnsayo, LecturaInstante } from "../types";
import { tauriCmd } from "../lib/tauriCommands";

const MAX_LECTURAS_BUFFER = 200;

interface EnsayoState {
  ensayos: RegistroEnsayo[];
  ensayoActivo: RegistroEnsayo | null;
  lecturas: LecturaInstante[];
  energyTaras: Record<string, number>; // columna → primer valor (tara)
  loading: boolean;
  error: string | null;
  cargarEnsayos: () => Promise<void>;
  setEnsayoActivo: (ensayo: RegistroEnsayo | null) => void;
  agregarLectura: (lectura: LecturaInstante) => void;
  limpiarLecturas: () => void;
  iniciarAdquisicion: (ensayoId: number) => Promise<void>;
  detenerAdquisicion: (ensayoId: number) => Promise<void>;
}

/** Check if a column is an energy column (E1, E2, E3) */
function isEnergyColumn(columna: string): boolean {
  const parts = columna.split("_");
  const variable = parts[1]?.toUpperCase() ?? "";
  return (
    variable.startsWith("E") && variable !== "E" && !variable.startsWith("EX")
  );
}

/** Apply energy tare: subtract initial value so energy starts from 0 */
function applyEnergyTare(
  lectura: LecturaInstante,
  taras: Record<string, number>,
): LecturaInstante {
  return {
    ...lectura,
    valores: lectura.valores.map((v) => {
      if (isEnergyColumn(v.columna) && v.valor != null) {
        const tara = taras[v.columna];
        if (tara != null) {
          return { ...v, valor: v.valor - tara };
        }
      }
      return v;
    }),
  };
}

export const useEnsayoStore = create<EnsayoState>((set, get) => ({
  ensayos: [],
  ensayoActivo: null,
  lecturas: [],
  energyTaras: {},
  loading: false,
  error: null,

  cargarEnsayos: async () => {
    set({ loading: true, error: null });
    try {
      const ensayos = await tauriCmd.listarEnsayos();
      set({ ensayos, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  setEnsayoActivo: (ensayo) => set({ ensayoActivo: ensayo }),

  agregarLectura: (lectura) => {
    const { lecturas, energyTaras } = get();

    // Capture tara values from first reading with energy data
    const newTaras = { ...energyTaras };
    let tarasChanged = false;
    for (const v of lectura.valores) {
      if (
        isEnergyColumn(v.columna) &&
        v.valor != null &&
        !(v.columna in newTaras)
      ) {
        newTaras[v.columna] = v.valor;
        tarasChanged = true;
      }
    }

    // Apply tare to this reading
    const lecturaConTara = applyEnergyTare(lectura, newTaras);

    const nuevas = [...lecturas, lecturaConTara];
    if (nuevas.length > MAX_LECTURAS_BUFFER) {
      set({
        lecturas: nuevas.slice(-MAX_LECTURAS_BUFFER),
        ...(tarasChanged ? { energyTaras: newTaras } : {}),
      });
    } else {
      set({
        lecturas: nuevas,
        ...(tarasChanged ? { energyTaras: newTaras } : {}),
      });
    }
  },

  limpiarLecturas: () => set({ lecturas: [], energyTaras: {} }),

  iniciarAdquisicion: async (ensayoId) => {
    await tauriCmd.iniciarAdquisicion(ensayoId);
    const ensayos = get().ensayos.map((e) =>
      e.id === ensayoId ? { ...e, estado: "ejecutando" as const } : e,
    );
    const activo = ensayos.find((e) => e.id === ensayoId) ?? null;
    set({ ensayos, ensayoActivo: activo, lecturas: [], energyTaras: {} });
  },

  detenerAdquisicion: async (ensayoId) => {
    await tauriCmd.detenerAdquisicion(ensayoId);
    const ensayos = get().ensayos.map((e) =>
      e.id === ensayoId ? { ...e, estado: "finalizado" as const } : e,
    );
    set({ ensayos, ensayoActivo: null });
  },
}));
