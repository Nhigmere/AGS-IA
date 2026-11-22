import { Alimento } from '../../models/Alimento';
import type { CategoriaAlimento, DatosAlimento } from '../../models/types';

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/**
 * Fábrica para instanciar y validar entidades Alimento a partir de JSON o DTOs.
 */
export class AlimentoFactory {
  public static crear(datos: DatosAlimento): Alimento {
    return new Alimento(datos);
  }

  public static crearDesdeJSON(json: unknown): Alimento {
    if (!esRegistro(json)) {
      throw new TypeError('El alimento en JSON debe ser un objeto válido.');
    }

    const { id, nombre, categoria, porcion, proteina, calorias, costo } = json;

    if (
      typeof id !== 'string' ||
      typeof nombre !== 'string' ||
      typeof categoria !== 'string' ||
      typeof porcion !== 'string'
    ) {
      throw new TypeError('Los campos id, nombre, categoria y porcion deben ser cadenas de texto.');
    }

    if (typeof proteina !== 'number' || typeof calorias !== 'number' || typeof costo !== 'number') {
      throw new TypeError('Los campos proteina, calorias y costo deben ser numéricos.');
    }

    return new Alimento({
      id,
      nombre,
      categoria: categoria as CategoriaAlimento,
      porcion,
      proteina,
      calorias,
      costo,
    });
  }

  public static crearCatalogoDesdeJSON(lista: unknown): Alimento[] {
    if (!Array.isArray(lista) || lista.length === 0) {
      throw new Error('El catálogo debe ser un arreglo no vacío de alimentos.');
    }

    const idsVistos = new Set<string>();
    const catalogo: Alimento[] = [];

    for (const item of lista) {
      const alimento = AlimentoFactory.crearDesdeJSON(item);
      if (idsVistos.has(alimento.id)) {
        throw new Error(`Se detectó un ID de alimento duplicado en el catálogo: "${alimento.id}".`);
      }
      idsVistos.add(alimento.id);
      catalogo.push(alimento);
    }

    return catalogo;
  }
}
