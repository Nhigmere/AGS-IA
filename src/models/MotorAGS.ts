import type { Alimento } from './Alimento';
import type { Individuo } from './Individuo';
import type {
  ConfiguracionEjecucion,
  GeneradorAleatorio,
  MotivoParo,
  ReporteGeneracion,
  ResultadoEjecucionAGS,
} from './types';
import { crearRNG } from './utils/rng';
import { PoblacionFactory } from '../patterns/factory/PoblacionFactory';
import { SujetoProgreso } from '../patterns/observer/SujetoProgreso';
import {
  CruceUnPunto,
  type EstrategiasAGS,
  MutacionBitFlip,
  PenalizacionEstatica,
  SeleccionTorneo,
} from '../patterns/strategy';

export interface OpcionesEjecucionMotor {
  readonly debeCancelar?: () => boolean;
}

/**
 * Calcula la distancia de Hamming media normalizada [0, 1] de forma exacta en O(P * N):
 * para cada posición de gen k con c_k unos, exactamente c_k * (P - c_k) pares difieren en k.
 */
export function calcularDiversidadPoblacion(poblacion: readonly Individuo[]): number {
  const tamano = poblacion.length;
  if (tamano <= 1) return 0;

  const longitud = poblacion[0].longitud;
  const paresTotales = (tamano * (tamano - 1)) / 2;
  let sumaDiferencias = 0;

  for (let bit = 0; bit < longitud; bit++) {
    let unos = 0;
    for (let i = 0; i < tamano; i++) {
      if (poblacion[i].obtenerGen(bit) === 1) {
        unos += 1;
      }
    }
    sumaDiferencias += unos * (tamano - unos);
  }

  return sumaDiferencias / (longitud * paresTotales);
}

function compararParaElitismo(a: Individuo, b: Individuo): number {
  if (b.aptitud !== a.aptitud) return b.aptitud - a.aptitud;
  if (a.factible !== b.factible) return a.factible ? -1 : 1;
  return b.proteinaTotal - a.proteinaTotal;
}

/**
 * Motor del Algoritmo Genético Simple (AGS) para el Problema de la Dieta.
 * Orquesta las estrategias de selección, cruce, mutación y penalización,
 * soporta elitismo opcional, paro por estancamiento y ejecución paso a paso o completa.
 */
export class MotorAGS {
  private readonly catalogo: readonly Alimento[];
  private readonly configuracion: ConfiguracionEjecucion;
  private readonly estrategias: EstrategiasAGS;
  private readonly sujetoProgreso: SujetoProgreso;
  private readonly limiteEstancamiento: number;

  private rng: GeneradorAleatorio;
  private poblacionActual: Individuo[] = [];
  private mejorFactibleGlobal: Individuo | null = null;
  private historial: ReporteGeneracion[] = [];
  private generacionActual = 0;
  private generacionConvergencia = 0;
  private generacionesSinMejora = 0;
  private evaluacionesTotales = 0;
  private finalizado = false;
  private motivoParo: MotivoParo = 'max_generaciones';
  private inicioMs = 0;
  private tiempoAcumuladoMs = 0;

  constructor(
    catalogo: readonly Alimento[],
    configuracion: ConfiguracionEjecucion,
    estrategiasPersonalizadas?: Partial<EstrategiasAGS>,
    sujetoProgreso?: SujetoProgreso,
  ) {
    if (catalogo.length === 0) {
      throw new Error('El MotorAGS requiere un catálogo con al menos un alimento.');
    }

    const { parametros } = configuracion;
    if (parametros.tamanoPoblacion < 1) {
      throw new RangeError('El tamaño de población debe ser mayor o igual a 1.');
    }
    if (parametros.maxGeneraciones < 1) {
      throw new RangeError('El máximo de generaciones debe ser mayor o igual a 1.');
    }
    if (
      parametros.cantidadElitismo < 0 ||
      parametros.cantidadElitismo >= parametros.tamanoPoblacion
    ) {
      throw new RangeError('La cantidad de elitismo debe ser >= 0 y menor al tamaño de población.');
    }

    this.catalogo = [...catalogo];
    this.configuracion = {
      restricciones: { ...configuracion.restricciones },
      parametros: { ...configuracion.parametros },
    };

    this.estrategias = {
      seleccion:
        estrategiasPersonalizadas?.seleccion ?? new SeleccionTorneo(parametros.tamanoTorneo),
      cruce: estrategiasPersonalizadas?.cruce ?? new CruceUnPunto(parametros.probabilidadCruce),
      mutacion:
        estrategiasPersonalizadas?.mutacion ?? new MutacionBitFlip(parametros.probabilidadMutacion),
      penalizacion:
        estrategiasPersonalizadas?.penalizacion ??
        new PenalizacionEstatica(parametros.factorPenalizacion),
    };

    this.sujetoProgreso = sujetoProgreso ?? new SujetoProgreso();
    this.limiteEstancamiento =
      parametros.porcentajeEstancamiento > 0
        ? Math.max(
            1,
            Math.round((parametros.maxGeneraciones * parametros.porcentajeEstancamiento) / 100),
          )
        : 0;

    this.rng = crearRNG(parametros.semilla);
  }

  public get progreso(): SujetoProgreso {
    return this.sujetoProgreso;
  }

  public get estaFinalizado(): boolean {
    return this.finalizado;
  }

  public get generacion(): number {
    return this.generacionActual;
  }

  /** Reinicia completamente el estado interno del motor con la semilla configurada. */
  public reiniciar(): void {
    this.rng = crearRNG(this.configuracion.parametros.semilla);
    this.poblacionActual = [];
    this.mejorFactibleGlobal = null;
    this.historial = [];
    this.generacionActual = 0;
    this.generacionConvergencia = 0;
    this.generacionesSinMejora = 0;
    this.evaluacionesTotales = 0;
    this.finalizado = false;
    this.motivoParo = 'max_generaciones';
    this.inicioMs = 0;
    this.tiempoAcumuladoMs = 0;
  }

  private evaluarPoblacion(poblacion: readonly Individuo[]): void {
    const { restricciones } = this.configuracion;
    const penalizar = (proteina: number, excesoKcal: number, excesoCosto: number): number =>
      this.estrategias.penalizacion.calcularAptitudPenalizada(proteina, excesoKcal, excesoCosto);

    for (const individuo of poblacion) {
      individuo.evaluar(this.catalogo, restricciones, penalizar);
    }
    this.evaluacionesTotales += poblacion.length;
  }

  private producirSiguientePoblacion(): Individuo[] {
    const { tamanoPoblacion, cantidadElitismo } = this.configuracion.parametros;
    const siguiente: Individuo[] = [];

    if (cantidadElitismo > 0) {
      const ordenados = [...this.poblacionActual].sort(compararParaElitismo);
      for (let i = 0; i < cantidadElitismo; i++) {
        siguiente.push(ordenados[i].clonar());
      }
    }

    while (siguiente.length < tamanoPoblacion) {
      const padreA = this.estrategias.seleccion.seleccionar(this.poblacionActual, this.rng);
      const padreB = this.estrategias.seleccion.seleccionar(this.poblacionActual, this.rng);
      const [hijoA, hijoB] = this.estrategias.cruce.cruzar(padreA, padreB, this.rng);

      siguiente.push(this.estrategias.mutacion.mutar(hijoA, this.rng));
      if (siguiente.length < tamanoPoblacion) {
        siguiente.push(this.estrategias.mutacion.mutar(hijoB, this.rng));
      }
    }

    return siguiente;
  }

  private registrarYEvaluarParo(): ReporteGeneracion {
    const { maxGeneraciones, epsilonEstancamiento, frecuenciaReporte } =
      this.configuracion.parametros;

    let mejorAptitud = Number.NEGATIVE_INFINITY;
    let sumaAptitud = 0;
    let factibles = 0;
    let mejorFactibleGen: Individuo | null = null;

    for (const ind of this.poblacionActual) {
      sumaAptitud += ind.aptitud;
      if (ind.aptitud > mejorAptitud) {
        mejorAptitud = ind.aptitud;
      }
      if (ind.factible) {
        factibles += 1;
        if (mejorFactibleGen === null || ind.proteinaTotal > mejorFactibleGen.proteinaTotal) {
          mejorFactibleGen = ind;
        }
      }
    }

    if (mejorFactibleGen !== null) {
      if (this.mejorFactibleGlobal === null) {
        this.mejorFactibleGlobal = mejorFactibleGen.clonar();
        this.generacionConvergencia = this.generacionActual;
        this.generacionesSinMejora = 0;
      } else if (
        mejorFactibleGen.proteinaTotal >
        this.mejorFactibleGlobal.proteinaTotal + epsilonEstancamiento
      ) {
        this.mejorFactibleGlobal = mejorFactibleGen.clonar();
        this.generacionConvergencia = this.generacionActual;
        this.generacionesSinMejora = 0;
      } else {
        if (mejorFactibleGen.proteinaTotal > this.mejorFactibleGlobal.proteinaTotal) {
          this.mejorFactibleGlobal = mejorFactibleGen.clonar();
        }
        this.generacionesSinMejora += 1;
      }
    } else {
      this.generacionesSinMejora += 1;
    }

    const reporte: ReporteGeneracion = {
      generacion: this.generacionActual,
      mejorAptitud,
      aptitudPromedio: sumaAptitud / this.poblacionActual.length,
      mejorFactibleGlobal: this.mejorFactibleGlobal ? this.mejorFactibleGlobal.proteinaTotal : 0,
      porcentajeFactibles: (factibles / this.poblacionActual.length) * 100,
      diversidad: calcularDiversidadPoblacion(this.poblacionActual),
    };

    this.historial.push(reporte);

    if (this.generacionActual >= maxGeneraciones) {
      this.finalizado = true;
      this.motivoParo = 'max_generaciones';
    } else if (
      this.limiteEstancamiento > 0 &&
      this.generacionesSinMejora >= this.limiteEstancamiento
    ) {
      this.finalizado = true;
      this.motivoParo = 'estancamiento';
    }

    const debeNotificar =
      this.generacionActual === 1 ||
      this.generacionActual % frecuenciaReporte === 0 ||
      this.finalizado;

    if (debeNotificar) {
      this.sujetoProgreso.notificar(reporte);
    }

    return reporte;
  }

  /**
   * Avanza una única generación del AGS. Permite pausar y reanudar desde el Worker
   * sin bloquear el hilo de mensajes.
   */
  public ejecutarSiguienteGeneracion(): ReporteGeneracion | null {
    if (this.finalizado) return null;

    const marcaInicio = performance.now();
    if (this.generacionActual === 0) {
      this.inicioMs = marcaInicio;
      const { tamanoPoblacion, probabilidadInicial } = this.configuracion.parametros;
      this.poblacionActual = PoblacionFactory.crearPoblacionInicial(
        tamanoPoblacion,
        this.catalogo.length,
        probabilidadInicial,
        this.rng,
      );
    } else {
      this.poblacionActual = this.producirSiguientePoblacion();
    }

    this.generacionActual += 1;
    this.evaluarPoblacion(this.poblacionActual);
    const reporte = this.registrarYEvaluarParo();
    this.tiempoAcumuladoMs += performance.now() - marcaInicio;

    return reporte;
  }

  public obtenerResultado(motivoOverride?: MotivoParo): ResultadoEjecucionAGS {
    return {
      mejorIndividuo: this.mejorFactibleGlobal ? this.mejorFactibleGlobal.toJSON() : null,
      historial: [...this.historial],
      generacionConvergencia: this.generacionConvergencia,
      generacionesEjecutadas: this.generacionActual,
      evaluacionesTotales: this.evaluacionesTotales,
      tiempoMs: Number(this.tiempoAcumuladoMs.toFixed(3)),
      motivoParo: motivoOverride ?? this.motivoParo,
      semilla: this.configuracion.parametros.semilla,
    };
  }

  /** Ejecuta el ciclo evolutivo completo hasta alcanzar una condición de paro o cancelación. */
  public ejecutar(opciones?: OpcionesEjecucionMotor): ResultadoEjecucionAGS {
    this.reiniciar();
    this.inicioMs = performance.now();

    while (!this.finalizado) {
      if (opciones?.debeCancelar?.()) {
        this.finalizado = true;
        this.motivoParo = 'cancelado';
        break;
      }
      this.ejecutarSiguienteGeneracion();
    }

    // Asegura medición total coherente cuando se ejecuta en bloque continuo
    if (this.inicioMs > 0 && this.tiempoAcumuladoMs === 0) {
      this.tiempoAcumuladoMs = performance.now() - this.inicioMs;
    }

    return this.obtenerResultado();
  }
}
