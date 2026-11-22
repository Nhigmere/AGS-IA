import { describe, expect, it } from 'vitest';
import { CATALOGO_INICIAL_DATOS } from '../../data/catalogoInicial';
import { AlimentoFactory } from '../../patterns/factory';
import { RESTRICCIONES_POR_DEFECTO } from '../../patterns/singleton';
import { EvaluadorAleatorio } from '../EvaluadorAleatorio';

const catalogo30 = AlimentoFactory.crearCatalogoDesdeJSON(CATALOGO_INICIAL_DATOS);

describe('EvaluadorAleatorio', () => {
  it('evalúa exactamente tamanoBloque × cantidadBloques dietas y registra curva monótona', () => {
    const evaluador = new EvaluadorAleatorio(catalogo30, RESTRICCIONES_POR_DEFECTO);
    const res = evaluador.ejecutar({
      tamanoBloque: 50,
      cantidadBloques: 40,
      probabilidadInicial: 0.2,
      semilla: 42,
    });

    expect(res.evaluacionesTotales).toBe(2000);
    expect(res.historial).toHaveLength(40);
    expect(res.mejorIndividuo).not.toBeNull();
    expect(res.mejorIndividuo!.factible).toBe(true);
    expect(res.bloqueMejorHallazgo).toBeGreaterThanOrEqual(1);
    expect(res.evaluacionMejorHallazgo).toBeLessThanOrEqual(2000);

    for (let i = 1; i < res.historial.length; i++) {
      expect(res.historial[i].mejorFactibleAcumulado).toBeGreaterThanOrEqual(
        res.historial[i - 1].mejorFactibleAcumulado,
      );
      expect(res.historial[i].evaluacionesAcumuladas).toBe((i + 1) * 50);
    }
  });

  it('es reproducible con la misma semilla y soporta cancelación', () => {
    const evaluador = new EvaluadorAleatorio(catalogo30, RESTRICCIONES_POR_DEFECTO);
    const resA = evaluador.ejecutar({
      tamanoBloque: 20,
      cantidadBloques: 10,
      probabilidadInicial: 0.2,
      semilla: 77,
    });
    const resB = evaluador.ejecutar({
      tamanoBloque: 20,
      cantidadBloques: 10,
      probabilidadInicial: 0.2,
      semilla: 77,
    });

    expect(resA.mejorIndividuo).toEqual(resB.mejorIndividuo);
    expect(resA.historial).toEqual(resB.historial);

    let bloques = 0;
    const cancelado = evaluador.ejecutar({
      tamanoBloque: 20,
      cantidadBloques: 10,
      probabilidadInicial: 0.2,
      semilla: 77,
      debeCancelar: () => {
        bloques += 1;
        return bloques > 3;
      },
    });
    expect(cancelado.historial).toHaveLength(3);
    expect(cancelado.evaluacionesTotales).toBe(60);
  });

  it('valida parámetros de entrada', () => {
    expect(() => new EvaluadorAleatorio([], RESTRICCIONES_POR_DEFECTO)).toThrow(
      /al menos un alimento/i,
    );

    const evaluador = new EvaluadorAleatorio(catalogo30, RESTRICCIONES_POR_DEFECTO);
    expect(() =>
      evaluador.ejecutar({
        tamanoBloque: 0,
        cantidadBloques: 10,
        probabilidadInicial: 0.2,
        semilla: 1,
      }),
    ).toThrow(RangeError);
    expect(() =>
      evaluador.ejecutar({
        tamanoBloque: 10,
        cantidadBloques: 0,
        probabilidadInicial: 0.2,
        semilla: 1,
      }),
    ).toThrow(RangeError);
  });
});
