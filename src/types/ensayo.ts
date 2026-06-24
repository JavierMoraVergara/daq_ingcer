export type EstadoEnsayo = "creado" | "ejecutando" | "finalizado" | "error";

export type AliasMap = Record<string, string>;

export interface RegistroEnsayo {
  id: number;
  nombre: string;
  descripcion: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string | null;
  esquema_id: number;
  intervalo_segundos: number;
  estado: EstadoEnsayo;
  archivo_csv: string;
  aliases: AliasMap;
}

export interface CrearEnsayoPayload {
  nombre: string;
  descripcion: string;
  esquema_id: number;
  intervalo_segundos: number;
  aliases: AliasMap;
}

export interface DatosEnsayo {
  cabeceras: string[];
  filas: (number | null)[][];
  timestamps: string[];
}
