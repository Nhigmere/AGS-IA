import type { Individuo } from '../../models/Individuo';
import type { GeneradorAleatorio } from '../../models/types';
import type { EstrategiaSeleccion } from './interfaces';

/**
 * Selección por torneo de tamaño k (por defecto k = 3).
 * Elige k individuos al azar con reemplazo y retorna el de mayor aptitud.
 */
export class SeleccionTorneo implements EstrategiaSeleccion {
  public readonly nombre = 'Torneo';
  public readonly tamanoTorneo: number;

  constructor(tamanoTorneo = 3) {
    if (!Number.isInteger(tamanoTorneo) || tamanoTorneo < 1) {
      throw new RangeError('El tamaño de torneo k debe ser un entero mayor o igual a 1.');
    }
    this.tamanoTorneo = tamanoTorneo;
  }

  public seleccionar(poblacion: readonly Individuo[], rng: GeneradorAleatorio): Individuo {
    if (poblacion.length === 0) {
      throw new Error('No se puede ejecutar la selección por torneo sobre una población vacía.');
    }

    const ultimoIndice = poblacion.length - 1;
    let ganador = poblacion[rng.enteroEnRango(0, ultimoIndice)];

    for (let i = 1; i < this.tamanoTorneo; i++) {
      const retador = poblacion[rng.enteroEnRango(0, ultimoIndice)];
      if (
        retador.aptitud > ganador.aptitud ||
        (retador.aptitud === ganador.aptitud && retador.factible && !ganador.factible)
      ) {
        ganador = retador;
      }
    }

    return ganador;
  }
}
