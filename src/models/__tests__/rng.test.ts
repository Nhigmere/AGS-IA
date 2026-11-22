import { describe, expect, it } from 'vitest';
import { crearRNG, derivarSemilla, mulberry32 } from '../utils/rng';

describe('rng (mulberry32)', () => {
  it('produce exactamente la misma secuencia para la misma semilla', () => {
    const rngA = crearRNG(42);
    const rngB = crearRNG(42);

    const secuenciaA = Array.from({ length: 50 }, () => rngA.siguiente());
    const secuenciaB = Array.from({ length: 50 }, () => rngB.siguiente());

    expect(secuenciaA).toEqual(secuenciaB);
    expect(rngA.semillaInicial).toBe(42);
  });

  it('produce secuencias distintas para semillas diferentes', () => {
    const rngA = crearRNG(42);
    const rngB = crearRNG(43);

    const secuenciaA = Array.from({ length: 20 }, () => rngA.siguiente());
    const secuenciaB = Array.from({ length: 20 }, () => rngB.siguiente());

    expect(secuenciaA).not.toEqual(secuenciaB);
  });

  it('genera valores dentro del rango [0, 1) con media cercana a 0.5', () => {
    const generador = mulberry32(123456);
    const n = 10_000;
    let suma = 0;

    for (let i = 0; i < n; i++) {
      const valor = generador();
      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThan(1);
      suma += valor;
    }

    const media = suma / n;
    expect(media).toBeGreaterThan(0.48);
    expect(media).toBeLessThan(0.52);
  });

  it('enteroEnRango genera enteros inclusivos en [min, max]', () => {
    const rng = crearRNG(99);
    const vistos = new Set<number>();

    for (let i = 0; i < 500; i++) {
      const valor = rng.enteroEnRango(1, 5);
      expect(Number.isInteger(valor)).toBe(true);
      expect(valor).toBeGreaterThanOrEqual(1);
      expect(valor).toBeLessThanOrEqual(5);
      vistos.add(valor);
    }

    expect(vistos).toEqual(new Set([1, 2, 3, 4, 5]));
    expect(rng.enteroEnRango(7, 7)).toBe(7);
  });

  it('booleano respeta las probabilidades extremas y sesgadas', () => {
    const rng = crearRNG(2026);

    for (let i = 0; i < 100; i++) {
      expect(rng.booleano(0)).toBe(false);
      expect(rng.booleano(1)).toBe(true);
    }

    const muestras = 10_000;
    let verdaderos = 0;
    for (let i = 0; i < muestras; i++) {
      if (rng.booleano(0.2)) verdaderos += 1;
    }

    const proporcion = verdaderos / muestras;
    expect(proporcion).toBeGreaterThan(0.18);
    expect(proporcion).toBeLessThan(0.22);
  });

  it('derivarSemilla es determinista y distingue desplazamientos', () => {
    expect(derivarSemilla(42, 0)).toBe(42);
    expect(derivarSemilla(42, 1)).toBe(derivarSemilla(42, 1));
    expect(derivarSemilla(42, 1)).not.toBe(derivarSemilla(42, 2));
  });

  it('lanza RangeError ante parámetros inválidos', () => {
    expect(() => mulberry32(Number.NaN)).toThrow(RangeError);
    expect(() => crearRNG(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => derivarSemilla(42, 1.5)).toThrow(RangeError);

    const rng = crearRNG(7);
    expect(() => rng.enteroEnRango(5, 2)).toThrow(RangeError);
    expect(() => rng.enteroEnRango(1.2, 5)).toThrow(RangeError);
    expect(() => rng.booleano(-0.1)).toThrow(RangeError);
    expect(() => rng.booleano(1.1)).toThrow(RangeError);
  });
});
