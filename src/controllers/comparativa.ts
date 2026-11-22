import type {
  CategoriaAlimento,
  Cromosoma,
  DatosAlimento,
  PuntoAleatorio,
  ReporteGeneracion,
  RestriccionesDieta,
  ResumenNutricional,
} from '../models/types';

export interface ResumenCategoriaProteina {
  readonly categoria: CategoriaAlimento;
  readonly proteina: number;
  readonly porcentaje: number;
  readonly cantidad: number;
}

export interface PuntoGraficaConvergencia {
  readonly generacion: number;
  readonly mejorFactibleAGS: number;
  readonly promedioAGS: number;
  readonly mejorAptitudGen: number;
  readonly mejorAleatorio: number | null;
  readonly porcentajeFactibles: number;
  readonly diversidad: number;
}

export interface EvaluacionDietaHumana extends ResumenNutricional {
  readonly factible: boolean;
  readonly excedeCalorias: boolean;
  readonly excedePresupuesto: boolean;
  readonly porcentajeCalorias: number;
  readonly porcentajePresupuesto: number;
}

/**
 * Combina el historial del AGS y el historial por bloques del evaluador aleatorio
 * en una serie unificada lista para graficar en el mismo eje X (generación/bloque).
 */
export function combinarCurvasConvergencia(
  historialAGS: readonly ReporteGeneracion[],
  historialAleatorio: readonly PuntoAleatorio[],
): PuntoGraficaConvergencia[] {
  const mapaAleatorio = new Map<number, number>();
  for (const punto of historialAleatorio) {
    mapaAleatorio.set(punto.bloque, punto.mejorFactibleAcumulado);
  }

  return historialAGS.map((rep) => ({
    generacion: rep.generacion,
    mejorFactibleAGS: Number(rep.mejorFactibleGlobal.toFixed(2)),
    promedioAGS: Number(rep.aptitudPromedio.toFixed(2)),
    mejorAptitudGen: Number(rep.mejorAptitud.toFixed(2)),
    mejorAleatorio: mapaAleatorio.has(rep.generacion)
      ? Number((mapaAleatorio.get(rep.generacion) ?? 0).toFixed(2))
      : null,
    porcentajeFactibles: Number(rep.porcentajeFactibles.toFixed(1)),
    diversidad: Number(rep.diversidad.toFixed(4)),
  }));
}

/**
 * Evalúa la selección manual del usuario (modo humano) fuera de las vistas .tsx,
 * cumpliendo la regla MVC de cero sumatorias o lógica de restricciones en componentes React.
 */
export function evaluarSeleccionHumana(
  catalogo: readonly DatosAlimento[],
  idsSeleccionados: readonly string[],
  restricciones: RestriccionesDieta,
): EvaluacionDietaHumana {
  const conjuntoIds = new Set(idsSeleccionados);
  let proteinaTotal = 0;
  let caloriasTotales = 0;
  let costoTotal = 0;
  let cantidadAlimentos = 0;

  for (const alimento of catalogo) {
    if (conjuntoIds.has(alimento.id)) {
      proteinaTotal += alimento.proteina;
      caloriasTotales += alimento.calorias;
      costoTotal += alimento.costo;
      cantidadAlimentos += 1;
    }
  }

  const excedeCalorias = caloriasTotales > restricciones.maxCalorias;
  const excedePresupuesto = costoTotal > restricciones.presupuesto;
  const factible = !excedeCalorias && !excedePresupuesto;

  const porcentajeCalorias =
    restricciones.maxCalorias > 0 ? (caloriasTotales / restricciones.maxCalorias) * 100 : 0;
  const porcentajePresupuesto =
    restricciones.presupuesto > 0 ? (costoTotal / restricciones.presupuesto) * 100 : 0;

  return {
    proteinaTotal: Number(proteinaTotal.toFixed(2)),
    caloriasTotales: Number(caloriasTotales.toFixed(1)),
    costoTotal: Number(costoTotal.toFixed(2)),
    cantidadAlimentos,
    factible,
    excedeCalorias,
    excedePresupuesto,
    porcentajeCalorias: Number(porcentajeCalorias.toFixed(1)),
    porcentajePresupuesto: Number(porcentajePresupuesto.toFixed(1)),
  };
}

/**
 * Agrupa la proteína aportada por categoría para la gráfica de dona del Resumen,
 * manteniendo cero sumatorias dentro de archivos .tsx.
 */
export function agruparProteinaPorCategoria(
  catalogo: readonly DatosAlimento[],
  cromosoma: Cromosoma | null,
): ResumenCategoriaProteina[] {
  if (!cromosoma || cromosoma.length !== catalogo.length) return [];

  const acumulado = new Map<CategoriaAlimento, { proteina: number; cantidad: number }>();
  let totalProteina = 0;

  for (let i = 0; i < cromosoma.length; i++) {
    if (cromosoma[i] !== 1) continue;
    const alimento = catalogo[i];
    const actual = acumulado.get(alimento.categoria) ?? { proteina: 0, cantidad: 0 };
    actual.proteina += alimento.proteina;
    actual.cantidad += 1;
    acumulado.set(alimento.categoria, actual);
    totalProteina += alimento.proteina;
  }

  return Array.from(acumulado.entries())
    .map(([categoria, datos]) => ({
      categoria,
      proteina: Number(datos.proteina.toFixed(1)),
      porcentaje:
        totalProteina > 0 ? Number(((datos.proteina / totalProteina) * 100).toFixed(1)) : 0,
      cantidad: datos.cantidad,
    }))
    .sort((a, b) => b.proteina - a.proteina);
}
