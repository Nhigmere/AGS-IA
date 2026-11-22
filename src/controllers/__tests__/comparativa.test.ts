import { describe, expect, it } from 'vitest';
import { CATALOGO_INICIAL_DATOS } from '../../data/catalogoInicial';
import { combinarCurvasConvergencia, evaluarSeleccionHumana } from '../comparativa';

describe('Utilidades del Controller de Comparativa', () => {
  it('combina historial del AGS y del aleatorio en el mismo eje X', () => {
    const combinada = combinarCurvasConvergencia(
      [
        {
          generacion: 1,
          mejorAptitud: 90,
          aptitudPromedio: 40.556,
          mejorFactibleGlobal: 90,
          porcentajeFactibles: 60,
          diversidad: 0.31234,
        },
        {
          generacion: 2,
          mejorAptitud: 110,
          aptitudPromedio: 55.2,
          mejorFactibleGlobal: 110,
          porcentajeFactibles: 65,
          diversidad: 0.28,
        },
      ],
      [
        { bloque: 1, evaluacionesAcumuladas: 50, mejorFactibleAcumulado: 82.4 },
        { bloque: 2, evaluacionesAcumuladas: 100, mejorFactibleAcumulado: 95.1 },
      ],
    );

    expect(combinada).toHaveLength(2);
    expect(combinada[0]).toEqual({
      generacion: 1,
      mejorFactibleAGS: 90,
      promedioAGS: 40.56,
      mejorAptitudGen: 90,
      mejorAleatorio: 82.4,
      porcentajeFactibles: 60,
      diversidad: 0.3123,
    });
    expect(combinada[1].mejorAleatorio).toBe(95.1);
  });

  it('evalúa correctamente la dieta armada manualmente por el usuario (factible y excedida)', () => {
    const seleccionFactible = evaluarSeleccionHumana(
      CATALOGO_INICIAL_DATOS,
      ['ali-01', 'ali-02', 'ali-08'],
      { maxCalorias: 2000, presupuesto: 150 },
    );

    expect(seleccionFactible.factible).toBe(true);
    expect(seleccionFactible.excedeCalorias).toBe(false);
    expect(seleccionFactible.excedePresupuesto).toBe(false);
    expect(seleccionFactible.cantidadAlimentos).toBe(3);
    expect(seleccionFactible.proteinaTotal).toBeCloseTo(31 + 24 + 14.5, 2);

    const todosIds = CATALOGO_INICIAL_DATOS.map((a) => a.id);
    const seleccionExcedida = evaluarSeleccionHumana(CATALOGO_INICIAL_DATOS, todosIds, {
      maxCalorias: 2000,
      presupuesto: 150,
    });

    expect(seleccionExcedida.factible).toBe(false);
    expect(seleccionExcedida.excedeCalorias).toBe(true);
    expect(seleccionExcedida.excedePresupuesto).toBe(true);
    expect(seleccionExcedida.porcentajeCalorias).toBeGreaterThan(100);
    expect(seleccionExcedida.porcentajePresupuesto).toBeGreaterThan(100);
  });
});
