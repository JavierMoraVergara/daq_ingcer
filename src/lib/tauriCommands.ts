import { invoke } from "@tauri-apps/api/core";
import type {
  Instrumento,
  CrearInstrumentoPayload,
  Esquema,
  CrearEsquemaPayload,
  ActualizarEsquemaPayload,
  RegistroEnsayo,
  CrearEnsayoPayload,
  DatosEnsayo,
} from "../types";

export const tauriCmd = {
  // Instrumentos
  listarInstrumentos: () => invoke<Instrumento[]>("listar_instrumentos"),
  crearInstrumento: (payload: CrearInstrumentoPayload) =>
    invoke<Instrumento>("crear_instrumento", { payload }),
  actualizarInstrumento: (id: number, payload: CrearInstrumentoPayload) =>
    invoke<Instrumento>("actualizar_instrumento", { id, payload }),
  probarConexion: (
    ip: string,
    puerto: number,
    slaveId: number,
    timeoutMs: number,
  ) => invoke<boolean>("probar_conexion", { ip, puerto, slaveId, timeoutMs }),

  // Esquemas
  listarEsquemas: () => invoke<Esquema[]>("listar_esquemas"),
  crearEsquema: (payload: CrearEsquemaPayload) =>
    invoke<Esquema>("crear_esquema", { payload }),
  actualizarEsquema: (id: number, payload: ActualizarEsquemaPayload) =>
    invoke<Esquema>("actualizar_esquema", { id, payload }),
  deshabilitarEsquema: (id: number) =>
    invoke<void>("deshabilitar_esquema", { id }),

  // Ensayos
  listarEnsayos: () => invoke<RegistroEnsayo[]>("listar_ensayos"),
  crearEnsayo: (payload: CrearEnsayoPayload) =>
    invoke<RegistroEnsayo>("crear_ensayo", { payload }),
  finalizarEnsayo: (id: number) =>
    invoke<RegistroEnsayo>("finalizar_ensayo", { id }),
  cargarDatosEnsayo: (id: number) =>
    invoke<DatosEnsayo>("cargar_datos_ensayo", { id }),
  exportarCsv: (id: number, destino: string) =>
    invoke<void>("exportar_csv", { id, destino }),

  // Adquisición
  iniciarAdquisicion: (ensayoId: number) =>
    invoke<void>("iniciar_adquisicion", { ensayoId }),
  detenerAdquisicion: (ensayoId: number) =>
    invoke<void>("detener_adquisicion", { ensayoId }),
};
