import type { Individuo } from '../../models/Individuo';
import type { GeneradorAleatorio } from '../../models/types';

/** Estrategia para seleccionar un progenitor desde la población actual. */
export interface EstrategiaSeleccion {
  readonly nombre: string;
  seleccionar(poblacion: readonly Individuo[], rng: GeneradorAleatorio): Individuo;
}

/** Estrategia para recombinar dos progenitores en dos descendientes. */
export interface EstrategiaCruce {
  readonly nombre: string;
  cruzar(padreA: Individuo, padreB: Individuo, rng: GeneradorAleatorio): [Individuo, Individuo];
}

/** Estrategia para mutar un individuo devolviendo una nueva instancia. */
export interface EstrategiaMutacion {
  readonly nombre: string;
  mutar(individuo: Individuo, rng: GeneradorAleatorio): Individuo;
}

/** Estrategia para penalizar la aptitud de individuos infactibles. */
export interface EstrategiaPenalizacion {
  readonly nombre: string;
  calcularAptitudPenalizada(
    proteinaTotal: number,
    excesoCalorias: number,
    excesoCosto: number,
  ): number;
}

export interface EstrategiasAGS {
  readonly seleccion: EstrategiaSeleccion;
  readonly cruce: EstrategiaCruce;
  readonly mutacion: EstrategiaMutacion;
  readonly penalizacion: EstrategiaPenalizacion;
}
