import { FACTOR_PENALIZACION_DEFECTO } from '../../models/Individuo';
import type { EstrategiaPenalizacion } from './interfaces';

/**
 * Penalización estática para soluciones infactibles:
 * aptitud = proteinaTotal * factorPenalizacion (default 0.001).
 */
export class PenalizacionEstatica implements EstrategiaPenalizacion {
  public readonly nombre = 'Penalización estática';
  public readonly factorPenalizacion: number;

  constructor(factorPenalizacion = FACTOR_PENALIZACION_DEFECTO) {
    if (!Number.isFinite(factorPenalizacion) || factorPenalizacion < 0 || factorPenalizacion > 1) {
      throw new RangeError('El factor de penalización debe estar en el rango [0, 1].');
    }
    this.factorPenalizacion = factorPenalizacion;
  }

  public calcularAptitudPenalizada(
    proteinaTotal: number,
    _excesoCalorias: number,
    _excesoCosto: number,
  ): number {
    return proteinaTotal * this.factorPenalizacion;
  }
}
