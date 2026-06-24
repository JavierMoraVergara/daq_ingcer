export interface Estadisticas {
  promedio: number | null;
  mediana: number | null;
  moda: number | null;
  desviacion_std: number | null;
  minimo: number | null;
  maximo: number | null;
}

export function calcularEstadisticas(valores: (number | null)[]): Estadisticas {
  const nums = valores.filter((v): v is number => v !== null);

  if (nums.length === 0) {
    return {
      promedio: null,
      mediana: null,
      moda: null,
      desviacion_std: null,
      minimo: null,
      maximo: null,
    };
  }

  const sorted = [...nums].sort((a, b) => a - b);
  const n = nums.length;

  const promedio = nums.reduce((s, v) => s + v, 0) / n;

  const mediana =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

  const freq = new Map<number, number>();
  nums.forEach((v) => freq.set(v, (freq.get(v) ?? 0) + 1));
  const maxFreq = Math.max(...freq.values());
  const moda = [...freq.entries()].find(([, f]) => f === maxFreq)?.[0] ?? null;

  const desviacion_std = Math.sqrt(
    nums.reduce((s, v) => s + (v - promedio) ** 2, 0) / n,
  );

  return {
    promedio,
    mediana,
    moda,
    desviacion_std,
    minimo: sorted[0],
    maximo: sorted[n - 1],
  };
}
