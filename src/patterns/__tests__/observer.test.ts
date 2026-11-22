import { describe, expect, it, vi } from 'vitest';
import type { ReporteGeneracion } from '../../models/types';
import { SujetoProgreso } from '../observer';

const reporteEjemplo: ReporteGeneracion = {
  generacion: 1,
  mejorAptitud: 120,
  aptitudPromedio: 80,
  mejorFactibleGlobal: 120,
  porcentajeFactibles: 76,
  diversidad: 0.32,
};

describe('Patrón Observer — SujetoProgreso', () => {
  it('notifica a los observadores suscritos y permite desuscripción directa o por retorno', () => {
    const sujeto = new SujetoProgreso();
    const obsA = vi.fn();
    const obsB = vi.fn();

    const desuscribirA = sujeto.suscribir(obsA);
    sujeto.suscribir(obsB);
    expect(sujeto.cantidadObservadores).toBe(2);

    sujeto.notificar(reporteEjemplo);
    expect(obsA).toHaveBeenCalledTimes(1);
    expect(obsA).toHaveBeenCalledWith(reporteEjemplo);
    expect(obsB).toHaveBeenCalledTimes(1);

    desuscribirA();
    expect(sujeto.cantidadObservadores).toBe(1);

    sujeto.notificar({ ...reporteEjemplo, generacion: 2 });
    expect(obsA).toHaveBeenCalledTimes(1);
    expect(obsB).toHaveBeenCalledTimes(2);

    sujeto.desuscribir(obsB);
    expect(sujeto.cantidadObservadores).toBe(0);
  });

  it('limpia todos los observadores registrados', () => {
    const sujeto = new SujetoProgreso();
    sujeto.suscribir(vi.fn());
    sujeto.suscribir(vi.fn());
    sujeto.limpiar();
    expect(sujeto.cantidadObservadores).toBe(0);
  });
});
