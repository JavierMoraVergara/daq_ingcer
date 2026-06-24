import { create } from "zustand";
import type { RegistroEnsayo, LecturaInstante } from "../types";
import { tauriCmd } from "../lib/tauriCommands";

const MAX_LECTURAS_BUFFER = 200;

interface EnsayoState {
  ensayos: RegistroEnsayo[];
  ensayoActivo: RegistroEnsayo | null;
  lecturas: LecturaInstante[];
  loading: boolean;
  error: string | null;
  cargarEnsayos: () => Promise<void>;
  setEnsayoActivo: (ensayo: RegistroEnsayo | null) => void;
  agregarLectura: (lectura: LecturaInstante) => void;
  limpiarLecturas: () => void;
  iniciarAdquisicion: (ensayoId: number) => Promise<void>;
  detenerAdquisicion: (ensayoId: number) => Promise<void>;
}

export const useEnsayoStore = create<EnsayoState>((set, get) => ({
  ensayos: [],
  ensayoActivo: null,
  lecturas: [],
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
    const { lecturas } = get();
    const nuevas = [...lecturas, lectura];
    if (nuevas.length > MAX_LECTURAS_BUFFER) {
      set({ lecturas: nuevas.slice(-MAX_LECTURAS_BUFFER) });
    } else {
      set({ lecturas: nuevas });
    }
  },

  limpiarLecturas: () => set({ lecturas: [] }),

  iniciarAdquisicion: async (ensayoId) => {
    await tauriCmd.iniciarAdquisicion(ensayoId);
    const ensayos = get().ensayos.map((e) =>
      e.id === ensayoId ? { ...e, estado: "ejecutando" as const } : e,
    );
    const activo = ensayos.find((e) => e.id === ensayoId) ?? null;
    set({ ensayos, ensayoActivo: activo, lecturas: [] });
  },

  detenerAdquisicion: async (ensayoId) => {
    await tauriCmd.detenerAdquisicion(ensayoId);
    const ensayos = get().ensayos.map((e) =>
      e.id === ensayoId ? { ...e, estado: "finalizado" as const } : e,
    );
    set({ ensayos, ensayoActivo: null });
  },
}));
