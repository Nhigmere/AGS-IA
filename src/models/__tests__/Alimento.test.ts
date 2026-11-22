import { describe, expect, it } from 'vitest';
import { Alimento } from '../Alimento';
import { CategoriaAlimento, type DatosAlimento } from '../types';

const datosValidos: DatosAlimento = {
  id: 'ali-01',
  nombre: 'Pechuga de pollo asada',
  categoria: CategoriaAlimento.PROTEINA_ANIMAL,
  porcion: '120 g',
  proteina: 31,
  calorias: 165,
  costo: 24,
};

describe('Alimento', () => {
  it('crea una instancia válida normalizando espacios y serializando correctamente', () => {
    const alimento = new Alimento({
      ...datosValidos,
      id: '  ali-01  ',
      nombre: '  Pechuga de pollo asada  ',
      porcion: '  120 g ',
    });

    expect(alimento.id).toBe('ali-01');
    expect(alimento.nombre).toBe('Pechuga de pollo asada');
    expect(alimento.porcion).toBe('120 g');
    expect(alimento.categoria).toBe(CategoriaAlimento.PROTEINA_ANIMAL);
    expect(alimento.toJSON()).toEqual(datosValidos);
  });

  it('permite valores numéricos iguales a cero', () => {
    const agua = new Alimento({
      id: 'ali-00',
      nombre: 'Agua natural',
      categoria: CategoriaAlimento.OTROS,
      porcion: '250 ml',
      proteina: 0,
      calorias: 0,
      costo: 0,
    });

    expect(agua.densidadProteicaPor100Kcal).toBe(0);
    expect(agua.proteinaPorPesoMXN).toBe(0);
  });

  it('calcula correctamente la densidad proteica por 100 kcal y proteína por MXN', () => {
    const alimento = new Alimento(datosValidos);

    expect(alimento.densidadProteicaPor100Kcal).toBeCloseTo((31 / 165) * 100, 4);
    expect(alimento.proteinaPorPesoMXN).toBeCloseTo(31 / 24, 4);
  });

  it('valida cadenas obligatorias no vacías', () => {
    expect(() => new Alimento({ ...datosValidos, id: '   ' })).toThrow(/id/i);
    expect(() => new Alimento({ ...datosValidos, nombre: '' })).toThrow(/nombre/i);
    expect(() => new Alimento({ ...datosValidos, porcion: '  ' })).toThrow(/porcion/i);
  });

  it('rechaza categorías desconocidas', () => {
    expect(
      () =>
        new Alimento({
          ...datosValidos,
          categoria: 'Chatarra' as CategoriaAlimento,
        }),
    ).toThrow(/categoría/i);
    expect(Alimento.esCategoriaValida('Leguminosas')).toBe(true);
    expect(Alimento.esCategoriaValida('Desconocida')).toBe(false);
  });

  it('rechaza valores numéricos negativos o no finitos', () => {
    expect(() => new Alimento({ ...datosValidos, proteina: -1 })).toThrow(RangeError);
    expect(() => new Alimento({ ...datosValidos, calorias: -10 })).toThrow(RangeError);
    expect(() => new Alimento({ ...datosValidos, costo: -0.5 })).toThrow(RangeError);
    expect(() => new Alimento({ ...datosValidos, proteina: Number.NaN })).toThrow(RangeError);
    expect(() => new Alimento({ ...datosValidos, calorias: Number.POSITIVE_INFINITY })).toThrow(
      RangeError,
    );
  });
});
