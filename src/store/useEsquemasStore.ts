import { create } from "zustand";
import type { Esquema, CrearEsquemaPayload } from "../types";
import { tauriCmd } from "../lib/tauriCommands";

interface EsquemasState {
  esquemas: Esquema[];
  loading: boolean;
  error: string | null;
  cargarEsquemas: () => Promise<void>;
  crearEsquema: (payload: CrearEsquemaPayload) => Promise<Esquema>;
  deshabilitarEsquema: (id: number) => Promise<void>;
}

export const useEsquemasStore = create<EsquemasState>((set) => ({
  esquemas: [],
  loading: false,
  error: null,

  cargarEsquemas: async () => {
    set({ loading: true, error: null });
    try {
      const esquemas = await tauriCmd.listarEsquemas();
      set({ esquemas, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  crearEsquema: async (payload) => {
    const esquema = await tauriCmd.crearEsquema(payload);
    // Reload all esquemas from backend to ensure consistency
    const esquemas = await tauriCmd.listarEsquemas();
    set({ esquemas });
    return esquema;
  },

  deshabilitarEsquema: async (id) => {
    await tauriCmd.deshabilitarEsquema(id);
    // Reload from backend to ensure consistency
    const esquemas = await tauriCmd.listarEsquemas();
    set({ esquemas });
  },
}));
