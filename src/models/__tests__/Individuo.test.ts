import { describe, expect, it } from 'vitest';
import { Alimento } from '../Alimento';
import { FACTOR_PENALIZACION_DEFECTO, Individuo } from '../Individuo';
import { CategoriaAlimento, type Gen, type RestriccionesDieta } from '../types';

const catalogoCorto: readonly Alimento[] = [
  new Alimento({
    id: 'a1',
    nombre: 'Pollo',
    categoria: CategoriaAlimento.PROTEINA_ANIMAL,
    porcion: '120 g',
    proteina: 30,
    calorias: 160,
    costo: 25,
  }),
  new Alimento({
    id: 'a2',
    nombre: 'Frijol',
    categoria: CategoriaAlimento.LEGUMINOSAS,
    porcion: '1 taza',
    proteina: 15,
    calorias: 220,
    costo: 10,
  }),
  new Alimento({
    id: 'a3',
    nombre: 'Arroz',
    categoria: CategoriaAlimento.CEREALES,
    porcion: '1 taza',
    proteina: 5,
    calorias: 200,
    costo: 5,
  }),
];

const restriccionesBase: RestriccionesDieta = {
  maxCalorias: 400,
  presupuesto: 35,
};

describe('Individuo', () => {
  it('almacena un cromosoma binario inmutable desde el exterior', () => {
    const genesOriginales: Gen[] = [1, 0, 1];
    const individuo = new Individuo(genesOriginales);
    genesOriginales[0] = 0;

    expect(individuo.longitud).toBe(3);
    expect(individuo.cromosoma).toEqual([1, 0, 1]);
    expect(individuo.obtenerGen(0)).toBe(1);
    expect(individuo.obtenerGen(1)).toBe(0);
    expect(individuo.aCadenaBinaria()).toBe('101');
    expect(individuo.evaluado).toBe(false);
  });

  it('valida el cromosoma en construcción y los índices de acceso', () => {
    expect(() => new Individuo([])).toThrow(/al menos un gen/i);
    expect(() => new Individuo([1, 2 as Gen, 0])).toThrow(RangeError);

    const individuo = new Individuo([1, 0, 1]);
    expect(() => individuo.obtenerGen(-1)).toThrow(RangeError);
    expect(() => individuo.obtenerGen(3)).toThrow(RangeError);
  });

  it('evalúa correctamente un individuo factible sin penalización', () => {
    const individuo = new Individuo([1, 1, 0]);
    const resultado = individuo.evaluar(catalogoCorto, restriccionesBase);

    expect(resultado).toEqual({
      proteinaTotal: 45,
      caloriasTotales: 380,
      costoTotal: 35,
      cantidadAlimentos: 2,
      factible: true,
      aptitud: 45,
    });
    expect(individuo.evaluado).toBe(true);
    expect(individuo.factible).toBe(true);
    expect(individuo.aptitud).toBe(45);
    expect(individuo.obtenerAlimentosSeleccionados(catalogoCorto).map((a) => a.id)).toEqual([
      'a1',
      'a2',
    ]);
  });

  it('aplica penalización estática por defecto cuando excede calorías o presupuesto', () => {
    const individuo = new Individuo([1, 1, 1]); // 580 kcal (> 400), $40 (> 35), 50 g prot
    const resultado = individuo.evaluar(catalogoCorto, restriccionesBase);

    expect(resultado.factible).toBe(false);
    expect(resultado.proteinaTotal).toBe(50);
    expect(resultado.aptitud).toBeCloseTo(50 * FACTOR_PENALIZACION_DEFECTO, 8);
  });

  it('acepta una función de penalización personalizada (contrato Strategy)', () => {
    const individuo = new Individuo([1, 1, 1]);
    const resultado = individuo.evaluar(
      catalogoCorto,
      restriccionesBase,
      (proteina, excesoKcal, excesoCosto) => Math.max(0, proteina - excesoKcal * 0.1 - excesoCosto),
    );

    // 50 - 180*0.1 - 5 = 27
    expect(resultado.factible).toBe(false);
    expect(resultado.aptitud).toBeCloseTo(27, 6);
  });

  it('rechaza evaluar o decodificar con un catálogo de longitud distinta a N', () => {
    const individuo = new Individuo([1, 0]);
    expect(() => individuo.evaluar(catalogoCorto, restriccionesBase)).toThrow(/incompatible/i);
    expect(() => individuo.obtenerAlimentosSeleccionados(catalogoCorto)).toThrow(/incompatible/i);
  });

  it('rechaza restricciones inválidas', () => {
    const individuo = new Individuo([1, 0, 0]);
    expect(() => individuo.evaluar(catalogoCorto, { maxCalorias: -100, presupuesto: 100 })).toThrow(
      RangeError,
    );
    expect(() =>
      individuo.evaluar(catalogoCorto, { maxCalorias: 2000, presupuesto: Number.NaN }),
    ).toThrow(RangeError);
  });

  it('calcula distancia de Hamming absoluta y normalizada', () => {
    const a = new Individuo([1, 0, 1, 0]);
    const b = new Individuo([1, 1, 0, 0]);
    const c = new Individuo([1, 0]);

    expect(a.distanciaHamming(b)).toBe(2);
    expect(a.distanciaHammingNormalizada(b)).toBe(0.5);
    expect(a.distanciaHamming(a)).toBe(0);
    expect(() => a.distanciaHamming(c)).toThrow(/distinta longitud/i);
  });

  it('clona profundamente preservando evaluación y serializa a DatosIndividuo', () => {
    const original = new Individuo([1, 0, 1]);
    original.evaluar(catalogoCorto, restriccionesBase);
    const clon = original.clonar();

    expect(clon).not.toBe(original);
    expect(clon.toJSON()).toEqual(original.toJSON());
    expect(clon.evaluado).toBe(true);
    expect(clon.proteinaTotal).toBe(35);
    expect(clon.caloriasTotales).toBe(360);
    expect(clon.costoTotal).toBe(30);
    expect(clon.cantidadAlimentos).toBe(2);
  });
});
