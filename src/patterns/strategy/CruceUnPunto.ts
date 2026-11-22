import { Individuo } from '../../models/Individuo';
import type { Gen, GeneradorAleatorio } from '../../models/types';
import type { EstrategiaCruce } from './interfaces';

/**
 * Cruce de un punto con probabilidad Pc (por defecto 0.80).
 * Selecciona un punto de corte aleatorio en [1, N - 1] e intercambia las colas.
 */
export class CruceUnPunto implements EstrategiaCruce {
  public readonly nombre = 'Cruce de un punto';
  public readonly probabilidadCruce: number;

  constructor(probabilidadCruce = 0.8) {
    if (!Number.isFinite(probabilidadCruce) || probabilidadCruce < 0 || probabilidadCruce > 1) {
      throw new RangeError('La probabilidad de cruce Pc debe estar en el rango [0, 1].');
    }
    this.probabilidadCruce = probabilidadCruce;
  }

  public cruzar(
    padreA: Individuo,
    padreB: Individuo,
    rng: GeneradorAleatorio,
  ): [Individuo, Individuo] {
    if (padreA.longitud !== padreB.longitud) {
      throw new Error(
        `No se pueden cruzar individuos de distinta longitud (${padreA.longitud} vs ${padreB.longitud}).`,
      );
    }

    const longitud = padreA.longitud;
    if (longitud < 2 || !rng.booleano(this.probabilidadCruce)) {
      return [padreA.clonar(), padreB.clonar()];
    }

    const puntoCorte = rng.enteroEnRango(1, longitud - 1);
    const genesA = padreA.cromosoma;
    const genesB = padreB.cromosoma;

    const hijoA: Gen[] = new Array<Gen>(longitud);
    const hijoB: Gen[] = new Array<Gen>(longitud);

    for (let i = 0; i < longitud; i++) {
      if (i < puntoCorte) {
        hijoA[i] = genesA[i];
        hijoB[i] = genesB[i];
      } else {
        hijoA[i] = genesB[i];
        hijoB[i] = genesA[i];
      }
    }

    return [new Individuo(hijoA), new Individuo(hijoB)];
  }
}
