import { describe, expect, it, vi } from 'vitest';
import { CATALOGO_INICIAL_DATOS } from '../../data/catalogoInicial';
import { AlimentoFactory } from '../../patterns/factory';
import { PARAMETROS_POR_DEFECTO, RESTRICCIONES_POR_DEFECTO } from '../../patterns/singleton';
import { EvaluadorAleatorio } from '../EvaluadorAleatorio';
import { Individuo } from '../Individuo';
import { calcularDiversidadPoblacion, MotorAGS } from '../MotorAGS';
import type { ConfiguracionEjecucion, ReporteGeneracion } from '../types';

const catalogo30 = AlimentoFactory.crearCatalogoDesdeJSON(CATALOGO_INICIAL_DATOS);

const configPorDefecto: ConfiguracionEjecucion = {
  restricciones: RESTRICCIONES_POR_DEFECTO,
  parametros: PARAMETROS_POR_DEFECTO,
};

describe('MotorAGS', () => {
  it('calcula la diversidad de Hamming O(P*N) idéntica al cálculo exacto por pares', () => {
    const poblacion = [
      new Individuo([1, 0, 1, 0]),
      new Individuo([1, 1, 0, 0]),
      new Individuo([0, 1, 1, 1]),
      new Individuo([1, 0, 0, 1]),
    ];

    let sumaDirecta = 0;
    let pares = 0;
    for (let i = 0; i < poblacion.length; i++) {
      for (let j = i + 1; j < poblacion.length; j++) {
        sumaDirecta += poblacion[i].distanciaHammingNormalizada(poblacion[j]);
        pares += 1;
      }
    }

    expect(calcularDiversidadPoblacion(poblacion)).toBeCloseTo(sumaDirecta / pares, 10);
    expect(calcularDiversidadPoblacion([poblacion[0]])).toBe(0);
  });

  it('es 100 % reproducible con la misma semilla (semilla 42)', () => {
    const resA = new MotorAGS(catalogo30, configPorDefecto).ejecutar();
    const resB = new MotorAGS(catalogo30, configPorDefecto).ejecutar();

    expect(resA.mejorIndividuo).toEqual(resB.mejorIndividuo);
    expect(resA.historial).toEqual(resB.historial);
    expect(resA.generacionConvergencia).toBe(resB.generacionConvergencia);
    expect(resA.generacionesEjecutadas).toBe(resB.generacionesEjecutadas);
    expect(resA.motivoParo).toBe(resB.motivoParo);
  });

  it('criterio de aceptación: con semilla 42 y defaults encuentra dieta factible >= aleatorio con igual presupuesto', () => {
    const resultadoAGS = new MotorAGS(catalogo30, configPorDefecto).ejecutar();

    expect(resultadoAGS.mejorIndividuo).not.toBeNull();
    expect(resultadoAGS.mejorIndividuo!.factible).toBe(true);
    expect(resultadoAGS.mejorIndividuo!.caloriasTotales).toBeLessThanOrEqual(
      RESTRICCIONES_POR_DEFECTO.maxCalorias,
    );
    expect(resultadoAGS.mejorIndividuo!.costoTotal).toBeLessThanOrEqual(
      RESTRICCIONES_POR_DEFECTO.presupuesto,
    );

    const evaluadorAleatorio = new EvaluadorAleatorio(catalogo30, RESTRICCIONES_POR_DEFECTO);
    const resultadoAleatorio = evaluadorAleatorio.ejecutar({
      tamanoBloque: PARAMETROS_POR_DEFECTO.tamanoPoblacion,
      cantidadBloques: resultadoAGS.generacionesEjecutadas,
      probabilidadInicial: PARAMETROS_POR_DEFECTO.probabilidadInicial,
      semilla: PARAMETROS_POR_DEFECTO.semilla,
    });

    expect(resultadoAleatorio.evaluacionesTotales).toBe(resultadoAGS.evaluacionesTotales);
    expect(resultadoAleatorio.mejorIndividuo).not.toBeNull();
    expect(resultadoAGS.mejorIndividuo!.proteinaTotal).toBeGreaterThanOrEqual(
      resultadoAleatorio.mejorIndividuo!.proteinaTotal,
    );
  });

  it('soporta paro por estancamiento y permite desactivarlo con porcentajeEstancamiento = 0', () => {
    const configConParoRapido: ConfiguracionEjecucion = {
      restricciones: RESTRICCIONES_POR_DEFECTO,
      parametros: {
        ...PARAMETROS_POR_DEFECTO,
        maxGeneraciones: 200,
        porcentajeEstancamiento: 10, // 20 generaciones sin mejora
        cantidadElitismo: 2,
      },
    };

    const resConParo = new MotorAGS(catalogo30, configConParoRapido).ejecutar();
    expect(resConParo.motivoParo).toBe('estancamiento');
    expect(resConParo.generacionesEjecutadas).toBeLessThan(200);

    const configSinParo: ConfiguracionEjecucion = {
      restricciones: RESTRICCIONES_POR_DEFECTO,
      parametros: {
        ...PARAMETROS_POR_DEFECTO,
        maxGeneraciones: 30,
        porcentajeEstancamiento: 0,
      },
    };

    const resSinParo = new MotorAGS(catalogo30, configSinParo).ejecutar();
    expect(resSinParo.motivoParo).toBe('max_generaciones');
    expect(resSinParo.generacionesEjecutadas).toBe(30);
    expect(resSinParo.evaluacionesTotales).toBe(30 * PARAMETROS_POR_DEFECTO.tamanoPoblacion);
  });

  it('conserva de forma monótona la mejor aptitud cuando el elitismo está activo (e >= 1)', () => {
    const configElitismo: ConfiguracionEjecucion = {
      restricciones: RESTRICCIONES_POR_DEFECTO,
      parametros: {
        ...PARAMETROS_POR_DEFECTO,
        maxGeneraciones: 40,
        cantidadElitismo: 2,
        porcentajeEstancamiento: 0,
      },
    };

    const resultado = new MotorAGS(catalogo30, configElitismo).ejecutar();
    for (let i = 1; i < resultado.historial.length; i++) {
      expect(resultado.historial[i].mejorAptitud).toBeGreaterThanOrEqual(
        resultado.historial[i - 1].mejorAptitud,
      );
    }
  });

  it('notifica al Observer cada K generaciones (incluyendo primera y última)', () => {
    const configK: ConfiguracionEjecucion = {
      restricciones: RESTRICCIONES_POR_DEFECTO,
      parametros: {
        ...PARAMETROS_POR_DEFECTO,
        maxGeneraciones: 12,
        porcentajeEstancamiento: 0,
        frecuenciaReporte: 5,
      },
    };

    const motor = new MotorAGS(catalogo30, configK);
    const recibidos: ReporteGeneracion[] = [];
    motor.progreso.suscribir((rep) => recibidos.push(rep));

    motor.ejecutar();
    expect(recibidos.map((r) => r.generacion)).toEqual([1, 5, 10, 12]);
  });

  it('la ejecución paso a paso coincide exactamente con ejecutar() y soporta cancelación', () => {
    const configCorta: ConfiguracionEjecucion = {
      restricciones: RESTRICCIONES_POR_DEFECTO,
      parametros: {
        ...PARAMETROS_POR_DEFECTO,
        maxGeneraciones: 15,
        porcentajeEstancamiento: 0,
      },
    };

    const completo = new MotorAGS(catalogo30, configCorta).ejecutar();

    const motorPaso = new MotorAGS(catalogo30, configCorta);
    while (!motorPaso.estaFinalizado) {
      motorPaso.ejecutarSiguienteGeneracion();
    }
    expect(motorPaso.ejecutarSiguienteGeneracion()).toBeNull();
    const pasoAPaso = motorPaso.obtenerResultado();

    expect(pasoAPaso.mejorIndividuo).toEqual(completo.mejorIndividuo);
    expect(pasoAPaso.historial).toEqual(completo.historial);
    expect(motorPaso.generacion).toBe(15);

    let llamadas = 0;
    const debeCancelar = vi.fn(() => {
      llamadas += 1;
      return llamadas > 5;
    });
    const cancelado = new MotorAGS(catalogo30, configCorta).ejecutar({ debeCancelar });
    expect(cancelado.motivoParo).toBe('cancelado');
    expect(cancelado.generacionesEjecutadas).toBe(5);
  });

  it('nunca reporta un individuo infactible como mejorIndividuo aunque ninguno cumpla restricciones', () => {
    const catalogoSinCero = [catalogo30[0], catalogo30[1]];
    const configImposible: ConfiguracionEjecucion = {
      restricciones: { maxCalorias: 1, presupuesto: 1 },
      parametros: {
        ...PARAMETROS_POR_DEFECTO,
        tamanoPoblacion: 10,
        maxGeneraciones: 5,
        probabilidadInicial: 0.99,
        probabilidadMutacion: 0.001,
        porcentajeEstancamiento: 0,
      },
    };

    const resultado = new MotorAGS(catalogoSinCero, configImposible).ejecutar();
    if (resultado.mejorIndividuo !== null) {
      expect(resultado.mejorIndividuo.factible).toBe(true);
    }
  });

  it('valida precondiciones del constructor', () => {
    expect(() => new MotorAGS([], configPorDefecto)).toThrow(/al menos un alimento/i);
    expect(
      () =>
        new MotorAGS(catalogo30, {
          ...configPorDefecto,
          parametros: { ...PARAMETROS_POR_DEFECTO, tamanoPoblacion: 0 },
        }),
    ).toThrow(RangeError);
    expect(
      () =>
        new MotorAGS(catalogo30, {
          ...configPorDefecto,
          parametros: { ...PARAMETROS_POR_DEFECTO, maxGeneraciones: 0 },
        }),
    ).toThrow(RangeError);
    expect(
      () =>
        new MotorAGS(catalogo30, {
          ...configPorDefecto,
          parametros: { ...PARAMETROS_POR_DEFECTO, cantidadElitismo: 50 },
        }),
    ).toThrow(RangeError);
  });
});
