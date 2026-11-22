import type { Alimento } from './Alimento';
import type { Individuo } from './Individuo';
import type { PuntoAleatorio, RestriccionesDieta, ResultadoAleatorio } from './types';
import { crearRNG } from './utils/rng';
import { PoblacionFactory } from '../patterns/factory/PoblacionFactory';
import { type EstrategiaPenalizacion, PenalizacionEstatica } from '../patterns/strategy';

export interface OpcionesEvaluadorAleatorio {
  /** Tamaño de bloque (igual al tamaño de población del AGS). */
  readonly tamanoBloque: number;
  /** Número de bloques (igual a las generaciones ejecutadas por el AGS). */
  readonly cantidadBloques: number;
  /** Misma probabilidad inicial p_inicial utilizada por el AGS. */
  readonly probabilidadInicial: number;
  readonly semilla: number;
  readonly penalizacion?: EstrategiaPenalizacion;
  readonly debeCancelar?: () => boolean;
}

/**
 * Línea base de búsqueda aleatoria pura con presupuesto de evaluaciones idéntico
 * al AGS (tamanoBloque × cantidadBloques), registrando la mejor proteína factible
 * acumulada por bloques para graficarla en el mismo eje X que el AGS.
 */
export class EvaluadorAleatorio {
  private readonly catalogo: readonly Alimento[];
  private readonly restricciones: RestriccionesDieta;

  constructor(catalogo: readonly Alimento[], restricciones: RestriccionesDieta) {
    if (catalogo.length === 0) {
      throw new Error('El EvaluadorAleatorio requiere un catálogo con al menos un alimento.');
    }
    this.catalogo = [...catalogo];
    this.restricciones = { ...restricciones };
  }

  public ejecutar(opciones: OpcionesEvaluadorAleatorio): ResultadoAleatorio {
    const { tamanoBloque, cantidadBloques, probabilidadInicial, semilla, debeCancelar } = opciones;

    if (!Number.isInteger(tamanoBloque) || tamanoBloque < 1) {
      throw new RangeError('El tamaño de bloque debe ser un entero mayor o igual a 1.');
    }
    if (!Number.isInteger(cantidadBloques) || cantidadBloques < 1) {
      throw new RangeError('La cantidad de bloques debe ser un entero mayor o igual a 1.');
    }

    const penalizacion = opciones.penalizacion ?? new PenalizacionEstatica();
    const penalizar = (proteina: number, excesoKcal: number, excesoCosto: number): number =>
      penalizacion.calcularAptitudPenalizada(proteina, excesoKcal, excesoCosto);

    const rng = crearRNG(semilla);
    const historial: PuntoAleatorio[] = [];
    let mejorFactible: Individuo | null = null;
    let bloqueMejorHallazgo = 0;
    let evaluacionMejorHallazgo = 0;
    let evaluacionesTotales = 0;

    const inicioMs = performance.now();

    for (let bloque = 1; bloque <= cantidadBloques; bloque++) {
      if (debeCancelar?.()) break;

      for (let i = 0; i < tamanoBloque; i++) {
        const candidato = PoblacionFactory.crearIndividuoAleatorio(
          this.catalogo.length,
          probabilidadInicial,
          rng,
        );
        candidato.evaluar(this.catalogo, this.restricciones, penalizar);
        evaluacionesTotales += 1;

        if (
          candidato.factible &&
          (mejorFactible === null || candidato.proteinaTotal > mejorFactible.proteinaTotal)
        ) {
          mejorFactible = candidato.clonar();
          bloqueMejorHallazgo = bloque;
          evaluacionMejorHallazgo = evaluacionesTotales;
        }
      }

      historial.push({
        bloque,
        evaluacionesAcumuladas: evaluacionesTotales,
        mejorFactibleAcumulado: mejorFactible ? mejorFactible.proteinaTotal : 0,
      });
    }

    const tiempoMs = Number((performance.now() - inicioMs).toFixed(3));

    return {
      mejorIndividuo: mejorFactible ? mejorFactible.toJSON() : null,
      historial,
      bloqueMejorHallazgo,
      evaluacionMejorHallazgo,
      evaluacionesTotales,
      tiempoMs,
      semilla,
    };
  }
}
