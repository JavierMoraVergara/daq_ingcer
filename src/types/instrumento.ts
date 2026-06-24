export type TipoInstrumento = "ADAM4118" | "JANITZA_UMG509";

export interface Instrumento {
  id: number;
  tipo: TipoInstrumento;
  nombre: string;
  direccion_ip: string;
  puerto: number;
  slave_id: number;
  timeout_ms: number;
  reintentos: number;
}

export interface CrearInstrumentoPayload {
  tipo: TipoInstrumento;
  nombre: string;
  direccion_ip: string;
  puerto: number;
  slave_id: number;
  timeout_ms: number;
  reintentos: number;
}
