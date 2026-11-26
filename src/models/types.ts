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

export type SexoBiologico = 'hombre' | 'mujer';

export type NivelActividad = 'sedentario' | 'ligero' | 'moderado' | 'activo' | 'muy_activo';

export type ObjetivoFisico = 'bajar' | 'mantener' | 'ganar';

export type ModoGastoDiario = 'actividad' | 'reloj' | 'total_manual';

export type CategoriaIMC =
  | 'bajo_peso'
  | 'saludable'
  | 'sobrepeso'
  | 'obesidad_1'
  | 'obesidad_2_3';

/** Datos físicos y meta nutricional ingresados por cualquier usuario. */
export interface PerfilUsuario {
  /** Peso actual en kilogramos (30–250 kg). */
  readonly pesoKg: number;
  /** Estatura en centímetros (120–230 cm). */
  readonly estaturaCm: number;
  /** Edad en años (14–100). */
  readonly edad: number;
  readonly sexo: SexoBiologico;
  readonly nivelActividad: NivelActividad;
  readonly objetivo: ObjetivoFisico;
  /** Presupuesto diario deseado en MXN (10–2000). */
  readonly presupuestoDiario: number;
  /** Peso meta personalizado en kg; null/undefined usa el peso recomendado automáticamente. */
  readonly pesoMetaKg?: number | null;
  /** Cómo se determina el gasto energético diario: factor de actividad, TMB + reloj o total manual. */
  readonly modoGasto?: ModoGastoDiario;
  /** Calorías extras/activas medidas por reloj en días de entrenamiento (pasos + ejercicio). */
  readonly caloriasActivasReloj?: number | null;
  /** Cuántos días a la semana entrenas con esas calorías extras (1–7; 7 = diario, 5 = Lun–Vie). */
  readonly diasEntrenoSemana?: number;
  /** Calorías extras en días de descanso (ej. Sáb–Dom solo pasos/vida diaria, 0–3500 kcal). */
  readonly caloriasDescansoReloj?: number | null;
  /** Calorías totales quemadas en el día medidas por el usuario (ej. reloj/ejercicio); null = estimar por actividad. */
  readonly caloriasQuemadasDia?: number | null;
  /** Magnitud positiva del déficit (bajar: 100–1000 kcal) o superávit (ganar: 100–600 kcal); null = default. */
  readonly ajusteCaloricoPersonalizado?: number | null;
}

/** Desglose legible de un plazo en años, meses (30 días) y días restantes. */
export interface DesgloseTiempo {
  readonly diasTotales: number;
  readonly anios: number;
  readonly meses: number;
  readonly diasRestantes: number;
  readonly textoCorto: string;
  readonly textoCompleto: string;
}

/** Punto cronológico en la línea de tiempo de progreso de peso. */
export interface HitoProyeccion {
  readonly etiqueta: string;
  readonly dia: number;
  readonly tiempo: DesgloseTiempo;
  readonly pesoProyectadoKg: number;
  readonly cambioAcumuladoKg: number;
  readonly caloriasAcumuladas: number;
  readonly porcentajeAvance: number;
  readonly esHitoSaludable?: boolean;
  readonly esMetaFinal?: boolean;
}

/** Estado proyectado al simular un día específico del plan. */
export interface AvanceEnDia {
  readonly dia: number;
  readonly tiempo: DesgloseTiempo;
  readonly pesoProyectadoKg: number;
  readonly cambioAcumuladoKg: number;
  readonly caloriasAcumuladas: number;
  readonly porcentajeAvance: number;
}

/** Proyección de calorías a quemar/acumular y días estimados para alcanzar la meta. */
export interface ProyeccionObjetivo {
  readonly pesoMetaKg: number;
  readonly kgPorCambiar: number;
  readonly direccion: 'bajar' | 'subir' | 'mantener';
  /** Calorías totales a quemar (déficit) o acumular (superávit) usando 7,700 kcal/kg. */
  readonly caloriasTotalesObjetivo: number;
  /** Déficit o superávit neto diario en kcal/día (|GET - caloriasObjetivo|). */
  readonly caloriasDiariasCambio: number;
  /** Cambio estimado en kg por día (3 decimales). */
  readonly kgPorDia: number;
  /** Cambio estimado en gramos por día. */
  readonly gramosPorDia: number;
  /** Cambio estimado en kg por semana. */
  readonly kgPorSemana: number;
  /** Cambio estimado en kg por mes (30 días). */
  readonly kgPorMes: number;
  /** Días estimados para lograr la meta (0 si ya se alcanzó o el objetivo es mantener). */
  readonly diasEstimados: number;
  readonly semanasEstimadas: number;
  readonly tiempoDesglosado: DesgloseTiempo;
  /** Calorías y días estimados para entrar al límite saludable (solo cuando excede pesoMaxSaludable). */
  readonly caloriasParaRangoSaludable: number;
  readonly diasParaRangoSaludable: number;
  readonly tiempoParaRangoSaludable: DesgloseTiempo;
  /** Hitos cronológicos (día 0, día 1, semanas, meses, años, meta). */
  readonly hitos: readonly HitoProyeccion[];
}

/** Resultado determinista de los cálculos corporales (OMS + Mifflin-St Jeor). */
export interface EvaluacionCorporal {
  readonly imc: number;
  readonly categoriaIMC: CategoriaIMC;
  readonly etiquetaIMC: string;
  readonly pesoMinSaludable: number;
  readonly pesoMaxSaludable: number;
  readonly pesoIdeal: number;
  /** 0 si está dentro del rango saludable; negativo si falta peso; positivo si excede el rango. */
  readonly diferenciaKgRango: number;
  /** Diferencia exacta peso actual menos peso ideal puntual (IMC 21.7). */
  readonly diferenciaKgIdeal: number;
  readonly tmb: number;
  /** Calorías extras promedio al día sobre la TMB (por actividad o reloj con días de entreno/descanso). */
  readonly caloriasExtrasDia: number;
  /** Total quemado en un día de entrenamiento (reloj) o igual al GET en otros modos. */
  readonly caloriasDiaEntreno: number;
  /** Total quemado en un día de descanso (reloj cuando días < 7) o igual al GET. */
  readonly caloriasDiaDescanso: number;
  /** Días de entrenamiento fuerte por semana (1–7). */
  readonly diasEntrenoSemana: number;
  /** Gasto energético diario efectivo (promedio semanal real). */
  readonly tdee: number;
  /** Gasto energético estimado teóricamente mediante TMB × factor de actividad. */
  readonly tdeeEstimado: number;
  /** Modo de cálculo utilizado para el gasto energético diario. */
  readonly modoGastoAplicado: ModoGastoDiario;
  /** true cuando el usuario ingresó datos de reloj o gasto total manual. */
  readonly usaGastoManual: boolean;
  readonly ajusteCalorico: number;
  readonly caloriasObjetivo: number;
  readonly pisoSeguroAplicado: boolean;
  /** true cuando el usuario selecciona un déficit exigente (> 750 kcal/día). */
  readonly alertaDeficitAgresivo: boolean;
  readonly proteinaRecomendadaG: number;
  readonly proteinaPorKg: number;
  /** Posición normalizada [0, 100] sobre la escala del termómetro (IMC 14 a 40). */
  readonly posicionTermometro: number;
  readonly proyeccion: ProyeccionObjetivo;
}
