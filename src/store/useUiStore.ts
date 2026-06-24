import { create } from "zustand";

type Vista = "esquemas" | "ensayo" | "revisar" | "configuracion";

interface UiState {
  vistaActual: Vista;
  modalAbierto: string | null;
  ensayoSeleccionadoId: number | null;
  setVista: (vista: Vista) => void;
  abrirModal: (modal: string) => void;
  cerrarModal: () => void;
  setEnsayoSeleccionado: (id: number | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  vistaActual: "esquemas",
  modalAbierto: null,
  ensayoSeleccionadoId: null,

  setVista: (vista) => set({ vistaActual: vista }),
  abrirModal: (modal) => set({ modalAbierto: modal }),
  cerrarModal: () => set({ modalAbierto: null }),
  setEnsayoSeleccionado: (id) => set({ ensayoSeleccionadoId: id }),
}));
