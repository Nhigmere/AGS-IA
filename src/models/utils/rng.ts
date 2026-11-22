import type { GeneradorAleatorio } from '../types';

/**
 * Generador pseudoaleatorio determinista basado en Mulberry32 (32 bits).
 * Garantiza reproducibilidad exacta entre ejecuciones y evita el uso de Math.random().
 */
export function mulberry32(semilla: number): () => number {
  if (!Number.isFinite(semilla)) {
    throw new RangeError('La semilla debe ser un número finito.');
  }

  let estado = Math.trunc(semilla) >>> 0;

  return (): number => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deriva una nueva semilla determinista a partir de una semilla base y un índice.
 * Útil para corridas múltiples (R corridas) o para el evaluador aleatorio.
 */
export function derivarSemilla(semillaBase: number, desplazamiento: number): number {
  if (!Number.isFinite(semillaBase) || !Number.isInteger(desplazamiento)) {
    throw new RangeError('La semilla base debe ser finita y el desplazamiento un entero.');
  }
  const baseUint = Math.trunc(semillaBase) >>> 0;
  const paso = Math.imul(desplazamiento >>> 0, 0x9e3779b1) >>> 0;
  return (baseUint ^ paso) >>> 0;
}

/**
 * Crea una instancia de GeneradorAleatorio reproducible usando Mulberry32.
 */
export function crearRNG(semilla: number): GeneradorAleatorio {
  if (!Number.isFinite(semilla)) {
    throw new RangeError('La semilla debe ser un número finito.');
  }

  const semillaNormalizada = Math.trunc(semilla) >>> 0;
  const generador = mulberry32(semillaNormalizada);

  return {
    semillaInicial: semillaNormalizada,

    siguiente(): number {
      return generador();
    },

    enteroEnRango(min: number, max: number): number {
      if (!Number.isInteger(min) || !Number.isInteger(max)) {
        throw new RangeError('Los límites min y max deben ser números enteros.');
      }
      if (min > max) {
        throw new RangeError(`El límite inferior (${min}) no puede superar al superior (${max}).`);
      }
      const amplitud = max - min + 1;
      return min + Math.floor(generador() * amplitud);
    },

    booleano(probabilidad = 0.5): boolean {
      if (!Number.isFinite(probabilidad) || probabilidad < 0 || probabilidad > 1) {
        throw new RangeError('La probabilidad debe estar en el rango [0, 1].');
      }
      if (probabilidad === 0) return false;
      if (probabilidad === 1) return true;
      return generador() < probabilidad;
    },
  };
}
