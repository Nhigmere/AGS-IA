import { Individuo } from '../../models/Individuo';
import type { Gen, GeneradorAleatorio } from '../../models/types';

/**
 * Fábrica para generar individuos y poblaciones iniciales con distribución sesgada
 * usando un generador pseudoaleatorio inyectado (sin Math.random).
 */
export class PoblacionFactory {
  public static crearIndividuoAleatorio(
    longitudCromosoma: number,
    probabilidadInicial: number,
    rng: GeneradorAleatorio,
  ): Individuo {
    if (!Number.isInteger(longitudCromosoma) || longitudCromosoma < 1) {
      throw new RangeError('La longitud del cromosoma N debe ser un entero mayor o igual a 1.');
    }
    if (
      !Number.isFinite(probabilidadInicial) ||
      probabilidadInicial < 0 ||
      probabilidadInicial > 1
    ) {
      throw new RangeError('La probabilidad inicial p_inicial debe estar en el rango [0, 1].');
    }

    const cromosoma: Gen[] = new Array<Gen>(longitudCromosoma);
    for (let i = 0; i < longitudCromosoma; i++) {
      cromosoma[i] = rng.booleano(probabilidadInicial) ? 1 : 0;
    }

    return new Individuo(cromosoma);
  }

  public static crearPoblacionInicial(
    tamanoPoblacion: number,
    longitudCromosoma: number,
    probabilidadInicial: number,
    rng: GeneradorAleatorio,
  ): Individuo[] {
    if (!Number.isInteger(tamanoPoblacion) || tamanoPoblacion < 1) {
      throw new RangeError('El tamaño de población debe ser un entero mayor o igual a 1.');
    }

    const poblacion: Individuo[] = new Array<Individuo>(tamanoPoblacion);
    for (let i = 0; i < tamanoPoblacion; i++) {
      poblacion[i] = PoblacionFactory.crearIndividuoAleatorio(
        longitudCromosoma,
        probabilidadInicial,
        rng,
      );
    }

    return poblacion;
  }
}
