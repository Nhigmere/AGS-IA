import { describe, expect, it } from 'vitest';
import { Alimento } from '../../models/Alimento';
import { Individuo } from '../../models/Individuo';
import { CategoriaAlimento, type Gen, type RestriccionesDieta } from '../../models/types';
import { crearRNG } from '../../models/utils/rng';
import { CruceUnPunto, MutacionBitFlip, PenalizacionEstatica, SeleccionTorneo } from '../strategy';

const catalogoMini: readonly Alimento[] = [
  new Alimento({
    id: 'm1',
    nombre: 'Pollo',
    categoria: CategoriaAlimento.PROTEINA_ANIMAL,
    porcion: '100 g',
    proteina: 30,
    calorias: 160,
    costo: 20,
  }),
  new Alimento({
    id: 'm2',
    nombre: 'Frijol',
    categoria: CategoriaAlimento.LEGUMINOSAS,
    porcion: '1 taza',
    proteina: 15,
    calorias: 220,
    costo: 10,
  }),
  new Alimento({
    id: 'm3',
    nombre: 'Avena',
    categoria: CategoriaAlimento.CEREALES,
    porcion: '45 g',
    proteina: 6,
    calorias: 170,
    costo: 5,
  }),
];

const restriccionesMini: RestriccionesDieta = { maxCalorias: 400, presupuesto: 35 };

describe('Patrón Strategy — Operadores genéticos y penalización', () => {
  describe('SeleccionTorneo', () => {
    it('favorece individuos con mayor aptitud y es determinista con RNG', () => {
      const bajo = new Individuo([0, 0, 1]); // 6 g
      const medio = new Individuo([0, 1, 0]); // 15 g
      const alto = new Individuo([1, 1, 0]); // 45 g
      for (const ind of [bajo, medio, alto]) {
        ind.evaluar(catalogoMini, restriccionesMini);
      }

      const seleccion = new SeleccionTorneo(3);
      const rng = crearRNG(42);
      let victoriasAlto = 0;

      for (let i = 0; i < 200; i++) {
        const ganador = seleccion.seleccionar([bajo, medio, alto], rng);
        if (ganador === alto) victoriasAlto += 1;
      }

      expect(victoriasAlto).toBeGreaterThan(120);
    });

    it('desempata priorizando individuos factibles sobre infactibles', () => {
      const infactible = new Individuo([1, 1, 1]);
      infactible.evaluar(catalogoMini, restriccionesMini, () => 15);
      const factible = new Individuo([0, 1, 0]);
      factible.evaluar(catalogoMini, restriccionesMini);

      expect(infactible.aptitud).toBe(factible.aptitud);
      const seleccion = new SeleccionTorneo(5);
      const ganador = seleccion.seleccionar([infactible, factible], crearRNG(7));
      expect(ganador.factible).toBe(true);
    });

    it('valida parámetros y población vacía', () => {
      expect(() => new SeleccionTorneo(0)).toThrow(RangeError);
      expect(() => new SeleccionTorneo(2.5)).toThrow(RangeError);

      const seleccion = new SeleccionTorneo(3);
      expect(() => seleccion.seleccionar([], crearRNG(1))).toThrow(/población vacía/i);
    });
  });

  describe('CruceUnPunto', () => {
    it('recombina dos progenitores en un punto en [1, N-1] cuando Pc = 1 sin mutar padres', () => {
      const padreA = new Individuo([1, 1, 1, 1, 1, 1]);
      const padreB = new Individuo([0, 0, 0, 0, 0, 0]);
      const cruce = new CruceUnPunto(1);
      const rng = crearRNG(42);

      const [hijoA, hijoB] = cruce.cruzar(padreA, padreB, rng);

      expect(padreA.aCadenaBinaria()).toBe('111111');
      expect(padreB.aCadenaBinaria()).toBe('000000');

      // Hijo A inicia con 1s y termina con 0s; Hijo B es su complemento exacto
      expect(hijoA.obtenerGen(0)).toBe(1);
      expect(hijoA.obtenerGen(5)).toBe(0);
      expect(hijoB.obtenerGen(0)).toBe(0);
      expect(hijoB.obtenerGen(5)).toBe(1);

      for (let i = 0; i < 6; i++) {
        expect(hijoA.obtenerGen(i) + hijoB.obtenerGen(i)).toBe(1);
      }
    });

    it('retorna clones idénticos cuando Pc = 0 o N < 2', () => {
      const padreA = new Individuo([1, 0, 1]);
      const padreB = new Individuo([0, 1, 0]);
      const cruceCero = new CruceUnPunto(0);
      const [hA, hB] = cruceCero.cruzar(padreA, padreB, crearRNG(10));

      expect(hA).not.toBe(padreA);
      expect(hB).not.toBe(padreB);
      expect(hA.cromosoma).toEqual(padreA.cromosoma);
      expect(hB.cromosoma).toEqual(padreB.cromosoma);

      const cruceUno = new CruceUnPunto(1);
      const [uA, uB] = cruceUno.cruzar(new Individuo([1]), new Individuo([0]), crearRNG(10));
      expect(uA.cromosoma).toEqual([1]);
      expect(uB.cromosoma).toEqual([0]);
    });

    it('rechaza Pc fuera de [0, 1] y padres de distinta longitud', () => {
      expect(() => new CruceUnPunto(-0.1)).toThrow(RangeError);
      expect(() => new CruceUnPunto(1.2)).toThrow(RangeError);

      const cruce = new CruceUnPunto(0.8);
      expect(() =>
        cruce.cruzar(new Individuo([1, 0]), new Individuo([1, 0, 1]), crearRNG(1)),
      ).toThrow(/distinta longitud/i);
    });
  });

  describe('MutacionBitFlip', () => {
    it('invierte todos los bits con Pm = 1 y ninguno con Pm = 0 sin alterar el original', () => {
      const original = new Individuo([1, 0, 1, 1, 0]);
      const sinMutacion = new MutacionBitFlip(0).mutar(original, crearRNG(5));
      const todoInvertido = new MutacionBitFlip(1).mutar(original, crearRNG(5));

      expect(sinMutacion.cromosoma).toEqual([1, 0, 1, 1, 0]);
      expect(todoInvertido.cromosoma).toEqual([0, 1, 0, 0, 1]);
      expect(original.cromosoma).toEqual([1, 0, 1, 1, 0]);
    });

    it('respeta la tasa estadística esperada para Pm intermedia', () => {
      const base = new Individuo(new Array<Gen>(100).fill(0));
      const mutacion = new MutacionBitFlip(0.1);
      const rng = crearRNG(123);

      let totalUnos = 0;
      const iteraciones = 200;
      for (let i = 0; i < iteraciones; i++) {
        const mutado = mutacion.mutar(base, rng);
        totalUnos += mutado.cromosoma.reduce<number>((acc, g) => acc + g, 0);
      }

      const proporcion = totalUnos / (iteraciones * 100);
      expect(proporcion).toBeGreaterThan(0.085);
      expect(proporcion).toBeLessThan(0.115);
    });

    it('rechaza Pm fuera de [0, 1]', () => {
      expect(() => new MutacionBitFlip(-0.01)).toThrow(RangeError);
      expect(() => new MutacionBitFlip(1.5)).toThrow(RangeError);
    });
  });

  describe('PenalizacionEstatica', () => {
    it('multiplica la proteína por el factor estático (default 0.001)', () => {
      const penalizacionDefecto = new PenalizacionEstatica();
      expect(penalizacionDefecto.calcularAptitudPenalizada(120, 300, 20)).toBeCloseTo(0.12, 6);

      const penalizacionCustom = new PenalizacionEstatica(0.05);
      expect(penalizacionCustom.calcularAptitudPenalizada(100, 50, 0)).toBeCloseTo(5, 6);
    });

    it('valida el rango [0, 1] del factor', () => {
      expect(() => new PenalizacionEstatica(-0.1)).toThrow(RangeError);
      expect(() => new PenalizacionEstatica(1.1)).toThrow(RangeError);
    });
  });
});
