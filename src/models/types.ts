/**
 * Tipos compartidos del dominio para el Algoritmo Genético Simple (AGS)
 * aplicado al Problema de la Dieta (mochila 0-1 multidimensional).
 *
 * Este módulo no importa React, Zustand ni APIs del DOM para poder ejecutarse
 * tanto en Web Workers como en Node (Vitest).
 */

export const CategoriaAlimento = {
  PROTEINA_ANIMAL: 'Proteína animal',
  LEGUMINOSAS: 'Leguminosas',
  LACTEOS: 'Lácteos',
  CEREALES: 'Cereales',
  FRUTAS: 'Frutas',
  VERDURAS: 'Verduras',
  GRASAS: 'Grasas',
  OTROS: 'Otros',
} as const;

export type CategoriaAlimento = (typeof CategoriaAlimento)[keyof typeof CategoriaAlimento];

export const CATEGORIAS_ALIMENTO: readonly CategoriaAlimento[] = Object.values(CategoriaAlimento);

export type Gen = 0 | 1;

export type Cromosoma = readonly Gen[];

/** Representación serializable de un Alimento (DTO para Worker, JSON y vistas). */
export interface DatosAlimento {
  readonly id: string;
  readonly nombre: string;
  readonly categoria: CategoriaAlimento;
  readonly porcion: string;
  /** Gramos de proteína por porción (>= 0). */
  readonly proteina: number;
  /** Kilocalorías por porción (>= 0). */
  readonly calorias: number;
  /** Costo en MXN por porción (>= 0). */
  readonly costo: number;
}

export interface ResumenNutricional {
  readonly proteinaTotal: number;
  readonly caloriasTotales: number;
  readonly costoTotal: number;
  readonly cantidadAlimentos: number;
}

export interface RestriccionesDieta {
  /** Límite máximo de calorías diarias en kcal (default: 2000). */
  readonly maxCalorias: number;
  /** Presupuesto máximo diario en MXN (default: 150). */
  readonly presupuesto: number;
}

export interface EvaluacionIndividuo extends ResumenNutricional {
  readonly factible: boolean;
  readonly aptitud: number;
}

/** Snapshot serializable de un Individuo para transferir desde el Worker al store/UI. */
export interface DatosIndividuo extends EvaluacionIndividuo {
  readonly cromosoma: Cromosoma;
}

/** Función de penalización para individuos infactibles (contrato compatible con Strategy). */
export type FuncionPenalizacion = (
  proteinaTotal: number,
  excesoCalorias: number,
  excesoCosto: number,
) => number;

export interface ParametrosAGS {
  readonly tamanoPoblacion: number;
  readonly maxGeneraciones: number;
  readonly probabilidadCruce: number;
  readonly probabilidadMutacion: number;
  readonly tamanoTorneo: number;
  readonly cantidadElitismo: number;
  readonly probabilidadInicial: number;
  readonly factorPenalizacion: number;
  /** Porcentaje del máximo de generaciones sin mejora (> epsilon) para paro anticipado (0 = desactivado). */
  readonly porcentajeEstancamiento: number;
  /** Mejora mínima en gramos de proteína para reiniciar el contador de estancamiento (default: 0.01). */
  readonly epsilonEstancamiento: number;
  readonly semilla: number;
  /** Emitir reporte cada K generaciones (default: 1). */
  readonly frecuenciaReporte: number;
}

export interface ConfiguracionEjecucion {
  readonly restricciones: RestriccionesDieta;
  readonly parametros: ParametrosAGS;
}

/** Contrato del Observer emitido por cada reporte generacional. */
export interface ReporteGeneracion {
  readonly generacion: number;
  /** Mejor aptitud de la generación actual. */
  readonly mejorAptitud: number;
  readonly aptitudPromedio: number;
  /** Mejor proteína factible acumulada hasta esta generación. */
  readonly mejorFactibleGlobal: number;
  /** Porcentaje de individuos factibles en la generación actual (0–100). */
  readonly porcentajeFactibles: number;
  /** Distancia de Hamming media normalizada de la población (0–1). */
  readonly diversidad: number;
}

export type MotivoParo = 'max_generaciones' | 'estancamiento' | 'cancelado';

export interface ResultadoEjecucionAGS {
  readonly mejorIndividuo: DatosIndividuo | null;
  readonly historial: readonly ReporteGeneracion[];
  readonly generacionConvergencia: number;
  readonly generacionesEjecutadas: number;
  readonly evaluacionesTotales: number;
  readonly tiempoMs: number;
  readonly motivoParo: MotivoParo;
  readonly semilla: number;
}

export interface PuntoAleatorio {
  readonly bloque: number;
  readonly evaluacionesAcumuladas: number;
  readonly mejorFactibleAcumulado: number;
}

export interface ResultadoAleatorio {
  readonly mejorIndividuo: DatosIndividuo | null;
  readonly historial: readonly PuntoAleatorio[];
  readonly bloqueMejorHallazgo: number;
  readonly evaluacionMejorHallazgo: number;
  readonly evaluacionesTotales: number;
  readonly tiempoMs: number;
  readonly semilla: number;
}

/** Contrato para el generador pseudoaleatorio inyectable y reproducible. */
export interface GeneradorAleatorio {
  readonly semillaInicial: number;
  /** Retorna un número flotante uniforme en el intervalo [0, 1). */
  siguiente(): number;
  /** Retorna un entero uniforme en el intervalo inclusivo [min, max]. */
  enteroEnRango(min: number, max: number): number;
  /** Retorna true con la probabilidad indicada (default: 0.5). */
  booleano(probabilidad?: number): boolean;
}
