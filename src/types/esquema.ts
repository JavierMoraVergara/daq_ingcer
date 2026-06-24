export interface CanalesADAM {
  [key: string]: number[]; // canales_1: [1,2,3,...], canales_2: [1,4,5,...]
}

export interface CanalesJanitza {
  [key: string]: string[]; // canales_1: ["v1","v2",...], canales_2: ["v1","c1",...]
}

export interface Esquema {
  id: number;
  nombre: string;
  version: number;
  vigente: boolean;
  fecha_hora_crea: string;
  usuario_crea: string;
  descripcion: string;
  cant_adam: number;
  instrumentos_adam: number[];
  canales_adam: CanalesADAM;
  cant_janitzas: number;
  instrumentos_janitza: number[];
  canales_janitzas: CanalesJanitza;
}

export interface CrearEsquemaPayload {
  nombre: string;
  descripcion: string;
  instrumentos_adam: number[];
  canales_adam: CanalesADAM;
  instrumentos_janitza: number[];
  canales_janitzas: CanalesJanitza;
}

export interface ActualizarEsquemaPayload {
  nombre?: string;
  descripcion?: string;
  instrumentos_adam?: number[];
  canales_adam?: CanalesADAM;
  instrumentos_janitza?: number[];
  canales_janitzas?: CanalesJanitza;
}
