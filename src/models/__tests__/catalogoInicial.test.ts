import { describe, expect, it } from 'vitest';
import { CATALOGO_INICIAL_DATOS } from '../../data/catalogoInicial';
import { Alimento } from '../Alimento';
import { Individuo } from '../Individuo';
import { CATEGORIAS_ALIMENTO, type Gen } from '../types';

describe('Catálogo inicial de alimentos (30 alimentos SMAE/USDA)', () => {
  const catalogo = CATALOGO_INICIAL_DATOS.map((datos) => new Alimento(datos));

  it('contiene exactamente 30 alimentos válidos con IDs únicos', () => {
    expect(catalogo).toHaveLength(30);

    const ids = new Set(catalogo.map((a) => a.id));
    expect(ids.size).toBe(30);
  });

  it('cubre las 8 categorías definidas en el dominio', () => {
    const categoriasPresentes = new Set(catalogo.map((a) => a.categoria));
    for (const categoria of CATEGORIAS_ALIMENTO) {
      expect(categoriasPresentes.has(categoria)).toBe(true);
    }
  });

  it('incluye al menos 8 fuentes altas en proteína (>= 12 g por porción)', () => {
    const altosEnProteina = catalogo.filter((a) => a.proteina >= 12);
    expect(altosEnProteina.length).toBeGreaterThanOrEqual(8);
  });

  it('excede ambas restricciones por defecto (2,000 kcal y $150 MXN) cuando se incluye todo', () => {
    const todosIncluidos = new Individuo(new Array<Gen>(catalogo.length).fill(1));
    const evaluacion = todosIncluidos.evaluar(catalogo, {
      maxCalorias: 2000,
      presupuesto: 150,
    });

    expect(evaluacion.caloriasTotales).toBeGreaterThan(2000);
    expect(evaluacion.costoTotal).toBeGreaterThan(150);
    expect(evaluacion.factible).toBe(false);
  });

  it('justifica p_inicial = 0.2: la media de 15 alimentos supera 2,000 kcal', () => {
    const caloriasTotales = catalogo.reduce((acc, a) => acc + a.calorias, 0);
    const caloriasPromedio15 = (caloriasTotales / catalogo.length) * 15;
    expect(caloriasPromedio15).toBeGreaterThan(2000);
  });
});
