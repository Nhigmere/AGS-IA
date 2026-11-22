import { CATEGORIAS_ALIMENTO, type CategoriaAlimento, type DatosAlimento } from './types';

function validarTextoNoVacio(valor: string, nombreCampo: string): string {
  const limpio = valor.trim();
  if (limpio.length === 0) {
    throw new Error(`El campo "${nombreCampo}" del alimento no puede estar vacío.`);
  }
  return limpio;
}

function validarNumeroNoNegativo(valor: number, nombreCampo: string): number {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new RangeError(
      `El campo "${nombreCampo}" del alimento debe ser un número finito mayor o igual a 0 (recibido: ${valor}).`,
    );
  }
  return valor;
}

/**
 * Entidad de dominio inmutable que representa una porción estándar de un alimento.
 */
export class Alimento implements DatosAlimento {
  public readonly id: string;
  public readonly nombre: string;
  public readonly categoria: CategoriaAlimento;
  public readonly porcion: string;
  public readonly proteina: number;
  public readonly calorias: number;
  public readonly costo: number;

  constructor(datos: DatosAlimento) {
    this.id = validarTextoNoVacio(datos.id, 'id');
    this.nombre = validarTextoNoVacio(datos.nombre, 'nombre');

    if (!Alimento.esCategoriaValida(datos.categoria)) {
      throw new Error(`Categoría de alimento inválida: "${String(datos.categoria)}".`);
    }
    this.categoria = datos.categoria;

    this.porcion = validarTextoNoVacio(datos.porcion, 'porcion');
    this.proteina = validarNumeroNoNegativo(datos.proteina, 'proteina');
    this.calorias = validarNumeroNoNegativo(datos.calorias, 'calorias');
    this.costo = validarNumeroNoNegativo(datos.costo, 'costo');
  }

  public static esCategoriaValida(valor: string): valor is CategoriaAlimento {
    return (CATEGORIAS_ALIMENTO as readonly string[]).includes(valor);
  }

  /** Gramos de proteína aportados por cada 100 kcal. */
  public get densidadProteicaPor100Kcal(): number {
    if (this.calorias === 0) return 0;
    return (this.proteina / this.calorias) * 100;
  }

  /** Gramos de proteína aportados por cada peso mexicano (MXN). */
  public get proteinaPorPesoMXN(): number {
    if (this.costo === 0) return 0;
    return this.proteina / this.costo;
  }

  /** Serializa el alimento a un objeto plano compatible con JSON y postMessage. */
  public toJSON(): DatosAlimento {
    return {
      id: this.id,
      nombre: this.nombre,
      categoria: this.categoria,
      porcion: this.porcion,
      proteina: this.proteina,
      calorias: this.calorias,
      costo: this.costo,
    };
  }
}
