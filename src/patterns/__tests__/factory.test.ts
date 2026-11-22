import { describe, expect, it } from 'vitest';
import { CATALOGO_INICIAL_DATOS } from '../../data/catalogoInicial';
import { CategoriaAlimento } from '../../models/types';
import { crearRNG } from '../../models/utils/rng';
import { AlimentoFactory, PoblacionFactory } from '../factory';

describe('Patrón Factory — AlimentoFactory y PoblacionFactory', () => {
  describe('AlimentoFactory', () => {
    it('construye un Alimento válido desde JSON y desde un arreglo completo', () => {
      const alimento = AlimentoFactory.crearDesdeJSON(CATALOGO_INICIAL_DATOS[0]);
      expect(alimento.id).toBe('ali-01');

      const catalogo = AlimentoFactory.crearCatalogoDesdeJSON(CATALOGO_INICIAL_DATOS);
      expect(catalogo).toHaveLength(30);
    });

    it('rechaza JSON con estructura o tipos inválidos y catálogos con IDs duplicados', () => {
      expect(() => AlimentoFactory.crearDesdeJSON(null)).toThrow(TypeError);
      expect(() => AlimentoFactory.crearDesdeJSON([])).toThrow(TypeError);
      expect(() =>
        AlimentoFactory.crearDesdeJSON({
          id: 123,
          nombre: 'Test',
          categoria: CategoriaAlimento.OTROS,
          porcion: '100 g',
          proteina: 10,
          calorias: 100,
          costo: 10,
        }),
      ).toThrow(TypeError);
      expect(() =>
        AlimentoFactory.crearDesdeJSON({
          id: 'x1',
          nombre: 'Test',
          categoria: CategoriaAlimento.OTROS,
          porcion: '100 g',
          proteina: '10',
          calorias: 100,
          costo: 10,
        }),
      ).toThrow(TypeError);

      expect(() => AlimentoFactory.crearCatalogoDesdeJSON([])).toThrow(/no vacío/i);
      expect(() =>
        AlimentoFactory.crearCatalogoDesdeJSON([
          CATALOGO_INICIAL_DATOS[0],
          CATALOGO_INICIAL_DATOS[0],
        ]),
      ).toThrow(/duplicado/i);
    });
  });

  describe('PoblacionFactory', () => {
    it('genera población inicial sesgada con p_inicial = 0.2 y reproducibilidad exacta', () => {
      const pobA = PoblacionFactory.crearPoblacionInicial(200, 30, 0.2, crearRNG(42));
      const pobB = PoblacionFactory.crearPoblacionInicial(200, 30, 0.2, crearRNG(42));

      expect(pobA).toHaveLength(200);
      expect(pobA.map((i) => i.aCadenaBinaria())).toEqual(pobB.map((i) => i.aCadenaBinaria()));

      const totalUnos = pobA.reduce(
        (acc, ind) => acc + ind.cromosoma.reduce<number>((s, g) => s + g, 0),
        0,
      );
      const proporcion = totalUnos / (200 * 30);
      expect(proporcion).toBeGreaterThan(0.17);
      expect(proporcion).toBeLessThan(0.23);
    });

    it('valida parámetros de tamaño, longitud y probabilidad', () => {
      const rng = crearRNG(1);
      expect(() => PoblacionFactory.crearIndividuoAleatorio(0, 0.2, rng)).toThrow(RangeError);
      expect(() => PoblacionFactory.crearIndividuoAleatorio(10, -0.1, rng)).toThrow(RangeError);
      expect(() => PoblacionFactory.crearIndividuoAleatorio(10, 1.5, rng)).toThrow(RangeError);
      expect(() => PoblacionFactory.crearPoblacionInicial(0, 10, 0.2, rng)).toThrow(RangeError);
    });
  });
});
