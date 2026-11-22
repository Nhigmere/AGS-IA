import type {
  ConfiguracionEjecucion,
  DatosAlimento,
  DatosIndividuo,
  ReporteGeneracion,
  ResultadoAleatorio,
  ResultadoEjecucionAGS,
} from '../models/types';

export interface ResultadoCorridaCompleta {
  readonly ags: ResultadoEjecucionAGS;
  readonly aleatorio: ResultadoAleatorio;
}

export interface EstadisticasMetodo {
  readonly proteinaMedia: number;
  readonly proteinaDesviacion: number;
  readonly mejorProteina: number;
  readonly caloriasMedias: number;
  readonly costoMedio: number;
  readonly porcentajeFactibles: number;
  readonly generacionOBloqueMedio: number;
  readonly tiempoMedioMs: number;
  readonly evaluacionesPorCorrida: number;
}

export interface PuntoCurvaComparativa {
  readonly paso: number;
  readonly proteinaMediaAGS: number;
  readonly proteinaMediaAleatorio: number;
}

export interface ResultadoComparativaMultiCorrida {
  readonly cantidadCorridas: number;
  readonly semillaBase: number;
  readonly estadisticasAGS: EstadisticasMetodo;
  readonly estadisticasAleatorio: EstadisticasMetodo;
  readonly mejorIndividuoAGS: DatosIndividuo | null;
  readonly mejorIndividuoAleatorio: DatosIndividuo | null;
  readonly curvaPromedio: readonly PuntoCurvaComparativa[];
  readonly corridasDetalle: readonly {
    readonly corrida: number;
    readonly semilla: number;
    readonly proteinaAGS: number;
    readonly caloriasAGS: number;
    readonly costoAGS: number;
    readonly factibleAGS: boolean;
    readonly generacionAGS: number;
    readonly tiempoAGSMs: number;
    readonly proteinaAleatorio: number;
    readonly caloriasAleatorio: number;
    readonly costoAleatorio: number;
    readonly factibleAleatorio: boolean;
    readonly bloqueAleatorio: number;
    readonly tiempoAleatorioMs: number;
    readonly evaluaciones: number;
  }[];
}

export interface ConfiguracionBarridoExperimentos {
  readonly valoresPc: readonly number[];
  readonly valoresPm: readonly number[];
  readonly corridasPorCombinacion: number;
}

export interface CeldaExperimento {
  readonly pc: number;
  readonly pm: number;
  readonly proteinaMedia: number;
  readonly proteinaDesviacion: number;
  readonly mejorProteina: number;
  readonly porcentajeFactibles: number;
  readonly generacionConvergenciaMedia: number;
  readonly tiempoMedioMs: number;
  readonly curvaPromedio: readonly {
    readonly generacion: number;
    readonly proteinaMedia: number;
  }[];
}

export interface ResultadoBarridoExperimentos {
  readonly configuracion: ConfiguracionBarridoExperimentos;
  readonly semillaBase: number;
  readonly celdas: readonly CeldaExperimento[];
  readonly totalCorridasEjecutadas: number;
  readonly cancelado: boolean;
  readonly tiempoTotalMs: number;
}

export interface ProgresoComparativa {
  readonly completadas: number;
  readonly total: number;
}

export interface ProgresoExperimentos {
  readonly completadas: number;
  readonly total: number;
  readonly pcActual: number;
  readonly pmActual: number;
}

export interface APIWorkerAGS {
  ejecutarAGS(
    catalogo: readonly DatosAlimento[],
    configuracion: ConfiguracionEjecucion,
    onProgreso: (reporte: ReporteGeneracion) => void,
  ): Promise<ResultadoCorridaCompleta>;
  pausarAGS(): void;
  reanudarAGS(): void;
  detenerAGS(): void;
  ejecutarComparativaMultiCorrida(
    catalogo: readonly DatosAlimento[],
    configuracion: ConfiguracionEjecucion,
    cantidadCorridas: number,
    onProgreso: (progreso: ProgresoComparativa) => void,
  ): Promise<ResultadoComparativaMultiCorrida>;
  cancelarComparativa(): void;
  ejecutarBarridoExperimentos(
    catalogo: readonly DatosAlimento[],
    configuracion: ConfiguracionEjecucion,
    barrido: ConfiguracionBarridoExperimentos,
    onProgreso: (progreso: ProgresoExperimentos) => void,
  ): Promise<ResultadoBarridoExperimentos>;
  cancelarExperimentos(): void;
}
