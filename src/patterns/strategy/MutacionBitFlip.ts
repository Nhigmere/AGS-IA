import { Individuo } from '../../models/Individuo';
import type { Gen, GeneradorAleatorio } from '../../models/types';
import type { EstrategiaMutacion } from './interfaces';

/**
 * Mutación bit-flip independiente por gen con probabilidad Pm.
 */
export class MutacionBitFlip implements EstrategiaMutacion {
  public readonly nombre = 'Mutación bit-flip';
  public readonly probabilidadMutacion: number;

  constructor(probabilidadMutacion: number) {
    if (
      !Number.isFinite(probabilidadMutacion) ||
      probabilidadMutacion < 0 ||
      probabilidadMutacion > 1
    ) {
      throw new RangeError('La probabilidad de mutación Pm debe estar en el rango [0, 1].');
    }
    this.probabilidadMutacion = probabilidadMutacion;
  }

  public mutar(individuo: Individuo, rng: GeneradorAleatorio): Individuo {
    const genes = individuo.cromosoma;
    const mutados: Gen[] = new Array<Gen>(genes.length);

    for (let i = 0; i < genes.length; i++) {
      if (rng.booleano(this.probabilidadMutacion)) {
        mutados[i] = genes[i] === 1 ? 0 : 1;
      } else {
        mutados[i] = genes[i];
      }
    }

    return new Individuo(mutados);
  }
}
