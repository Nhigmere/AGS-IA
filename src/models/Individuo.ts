import type { Alimento } from './Alimento';
import type {
  Cromosoma,
  DatosIndividuo,
  EvaluacionIndividuo,
  FuncionPenalizacion,
  Gen,
  RestriccionesDieta,
  ResumenNutricional,
} from './types';

export const FACTOR_PENALIZACION_DEFECTO = 0.001;

const penalizacionEstaticaPorDefecto: FuncionPenalizacion = (proteinaTotal) =>
  proteinaTotal * FACTOR_PENALIZACION_DEFECTO;

function validarCromosoma(genes: readonly number[]): Gen[] {
  if (genes.length === 0) {
    throw new Error('El cromosoma debe contener al menos un gen.');
  }

  const copia: Gen[] = new Array<Gen>(genes.length);
  for (let i = 0; i < genes.length; i++) {
    const gen = genes[i];
    if (gen !== 0 && gen !== 1) {
      throw new RangeError(
        `Todos los genes del cromosoma deben ser binarios (0 o 1). Valor inválido en índice ${i}: ${String(gen)}.`,
      );
    }
    copia[i] = gen;
  }
  return copia;
}

function validarRestricciones(restricciones: RestriccionesDieta): void {
  if (!Number.isFinite(restricciones.maxCalorias) || restricciones.maxCalorias < 0) {
    throw new RangeError('El límite de calorías debe ser un número finito mayor o igual a 0.');
  }
  if (!Number.isFinite(restricciones.presupuesto) || restricciones.presupuesto < 0) {
    throw new RangeError('El presupuesto debe ser un número finito mayor o igual a 0.');
  }
}

/**
 * Representa una dieta candidata codificada como un cromosoma binario de longitud fija N,
 * donde gen_i = 1 indica que el alimento i del catálogo se incluye en el menú diario.
 */
export class Individuo {
  private readonly _cromosoma: Gen[];
  private _proteinaTotal = 0;
  private _caloriasTotales = 0;
  private _costoTotal = 0;
  private _cantidadAlimentos = 0;
  private _factible = false;
  private _aptitud = 0;
  private _evaluado = false;

  constructor(cromosoma: readonly Gen[]) {
    this._cromosoma = validarCromosoma(cromosoma);
  }

  public get longitud(): number {
    return this._cromosoma.length;
  }

  public get cromosoma(): Cromosoma {
    return [...this._cromosoma];
  }

  public get proteinaTotal(): number {
    return this._proteinaTotal;
  }

  public get caloriasTotales(): number {
    return this._caloriasTotales;
  }

  public get costoTotal(): number {
    return this._costoTotal;
  }

  public get cantidadAlimentos(): number {
    return this._cantidadAlimentos;
  }

  public get factible(): boolean {
    return this._factible;
  }

  public get aptitud(): number {
    return this._aptitud;
  }

  public get evaluado(): boolean {
    return this._evaluado;
  }

  public obtenerGen(indice: number): Gen {
    if (!Number.isInteger(indice) || indice < 0 || indice >= this._cromosoma.length) {
      throw new RangeError(
        `Índice de gen fuera de rango: ${indice} (longitud: ${this._cromosoma.length}).`,
      );
    }
    return this._cromosoma[indice];
  }

  private validarLongitudCatalogo(catalogo: readonly Alimento[]): void {
    if (catalogo.length !== this._cromosoma.length) {
      throw new Error(
        `Longitud incompatible entre cromosoma (${this._cromosoma.length}) y catálogo (${catalogo.length}).`,
      );
    }
  }

  /** Calcula los totales nutricionales y de costo de la dieta codificada. */
  public calcularTotales(catalogo: readonly Alimento[]): ResumenNutricional {
    this.validarLongitudCatalogo(catalogo);

    let proteinaTotal = 0;
    let caloriasTotales = 0;
    let costoTotal = 0;
    let cantidadAlimentos = 0;

    for (let i = 0; i < this._cromosoma.length; i++) {
      if (this._cromosoma[i] === 1) {
        const alimento = catalogo[i];
        proteinaTotal += alimento.proteina;
        caloriasTotales += alimento.calorias;
        costoTotal += alimento.costo;
        cantidadAlimentos += 1;
      }
    }

    return {
      proteinaTotal,
      caloriasTotales,
      costoTotal,
      cantidadAlimentos,
    };
  }

  /**
   * Evalúa la factibilidad y la aptitud del individuo frente al catálogo y las restricciones.
   * Por defecto aplica penalización estática (proteinaTotal * 0.001) a individuos infactibles.
   */
  public evaluar(
    catalogo: readonly Alimento[],
    restricciones: RestriccionesDieta,
    penalizar: FuncionPenalizacion = penalizacionEstaticaPorDefecto,
  ): EvaluacionIndividuo {
    validarRestricciones(restricciones);
    const totales = this.calcularTotales(catalogo);

    const excesoCalorias = Math.max(0, totales.caloriasTotales - restricciones.maxCalorias);
    const excesoCosto = Math.max(0, totales.costoTotal - restricciones.presupuesto);
    const factible = excesoCalorias === 0 && excesoCosto === 0;

    const aptitud = factible
      ? totales.proteinaTotal
      : penalizar(totales.proteinaTotal, excesoCalorias, excesoCosto);

    this._proteinaTotal = totales.proteinaTotal;
    this._caloriasTotales = totales.caloriasTotales;
    this._costoTotal = totales.costoTotal;
    this._cantidadAlimentos = totales.cantidadAlimentos;
    this._factible = factible;
    this._aptitud = aptitud;
    this._evaluado = true;

    return {
      ...totales,
      factible,
      aptitud,
    };
  }

  /** Devuelve los alimentos del catálogo cuyo gen correspondiente es 1. */
  public obtenerAlimentosSeleccionados(catalogo: readonly Alimento[]): Alimento[] {
    this.validarLongitudCatalogo(catalogo);

    const seleccionados: Alimento[] = [];
    for (let i = 0; i < this._cromosoma.length; i++) {
      if (this._cromosoma[i] === 1) {
        seleccionados.push(catalogo[i]);
      }
    }
    return seleccionados;
  }

  /** Distancia de Hamming absoluta (número de bits distintos) respecto a otro individuo. */
  public distanciaHamming(otro: Individuo): number {
    if (this._cromosoma.length !== otro._cromosoma.length) {
      throw new Error(
        `No se puede calcular la distancia de Hamming entre cromosomas de distinta longitud (${this._cromosoma.length} vs ${otro._cromosoma.length}).`,
      );
    }

    let diferencias = 0;
    for (let i = 0; i < this._cromosoma.length; i++) {
      if (this._cromosoma[i] !== otro._cromosoma[i]) {
        diferencias += 1;
      }
    }
    return diferencias;
  }

  /** Distancia de Hamming normalizada en el rango [0, 1]. */
  public distanciaHammingNormalizada(otro: Individuo): number {
    return this.distanciaHamming(otro) / this._cromosoma.length;
  }

  /** Retorna una copia profunda del individuo conservando su estado de evaluación. */
  public clonar(): Individuo {
    const copia = new Individuo(this._cromosoma);
    copia._proteinaTotal = this._proteinaTotal;
    copia._caloriasTotales = this._caloriasTotales;
    copia._costoTotal = this._costoTotal;
    copia._cantidadAlimentos = this._cantidadAlimentos;
    copia._factible = this._factible;
    copia._aptitud = this._aptitud;
    copia._evaluado = this._evaluado;
    return copia;
  }

  /** Representación textual del cromosoma como tira de bits (ej. "101001"). */
  public aCadenaBinaria(): string {
    return this._cromosoma.join('');
  }

  /** Serializa el individuo a un snapshot plano para el Worker, store o exportación. */
  public toJSON(): DatosIndividuo {
    return {
      cromosoma: this.cromosoma,
      proteinaTotal: this._proteinaTotal,
      caloriasTotales: this._caloriasTotales,
      costoTotal: this._costoTotal,
      cantidadAlimentos: this._cantidadAlimentos,
      factible: this._factible,
      aptitud: this._aptitud,
    };
  }
}
