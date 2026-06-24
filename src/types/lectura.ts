export interface ValorCanal {
  columna: string;
  valor: number | null;
  unidad: string;
}

export interface LecturaInstante {
  id: number;
  timestamp: string; // ISO 8601
  valores: ValorCanal[];
}
