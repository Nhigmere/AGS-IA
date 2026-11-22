import { beforeEach, describe, expect, it } from 'vitest';
import { CategoriaAlimento, type DatosAlimento } from '../../models/types';
import {
  type AlmacenPersistencia,
  CatalogoRepositorio,
  ConfiguracionGlobal,
  PARAMETROS_POR_DEFECTO,
  RESTRICCIONES_POR_DEFECTO,
} from '../singleton';

function crearAlmacenMemoria(): AlmacenPersistencia & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => {
      datos.set(clave, valor);
    },
    removeItem: (clave) => {
      datos.delete(clave);
    },
  };
}

const alimentoExtra: DatosAlimento = {
  id: 'ali-99',
  nombre: 'Claras de huevo',
  categoria: CategoriaAlimento.PROTEINA_ANIMAL,
  porcion: '4 claras (130 g)',
  proteina: 14.3,
  calorias: 68,
  costo: 12,
};

describe('Patrón Singleton — CatalogoRepositorio y ConfiguracionGlobal', () => {
  beforeEach(() => {
    CatalogoRepositorio.reiniciarInstancia();
    ConfiguracionGlobal.reiniciarInstancia();
  });

  describe('CatalogoRepositorio', () => {
    it('mantiene una única instancia, expone snapshots inmutables y persiste CRUD', () => {
      const almacen = crearAlmacenMemoria();
      const repoA = CatalogoRepositorio.obtenerInstancia(almacen);
      const repoB = CatalogoRepositorio.obtenerInstancia();

      expect(repoA).toBe(repoB);
      expect(repoA.longitud).toBe(30);

      repoA.agregar(alimentoExtra);
      expect(repoA.longitud).toBe(31);
      expect(repoA.obtenerPorId('ali-99')?.nombre).toBe('Claras de huevo');

      repoA.actualizar('ali-99', { ...alimentoExtra, costo: 14 });
      expect(repoA.obtenerPorId('ali-99')?.costo).toBe(14);

      // Reinstanciar leyendo del mismo almacenamiento recupera los cambios
      CatalogoRepositorio.reiniciarInstancia();
      const repoRecargado = CatalogoRepositorio.obtenerInstancia(almacen);
      expect(repoRecargado.longitud).toBe(31);
      expect(repoRecargado.obtenerPorId('ali-99')?.costo).toBe(14);

      expect(repoRecargado.eliminar('ali-99')).toBe(true);
      expect(repoRecargado.eliminar('inexistente')).toBe(false);
      expect(repoRecargado.longitud).toBe(30);

      repoRecargado.restaurarPorDefecto();
      expect(repoRecargado.longitud).toBe(30);
    });

    it('rechaza duplicados, actualizaciones inexistentes y eliminar el último alimento', () => {
      const repo = CatalogoRepositorio.obtenerInstancia(null);
      expect(() => repo.agregar(repo.obtenerSnapshot()[0])).toThrow(/ya existe/i);
      expect(() => repo.actualizar('no-existe', alimentoExtra)).toThrow(/no se encontró/i);

      repo.reemplazarCatalogo([alimentoExtra]);
      expect(repo.longitud).toBe(1);
      expect(() => repo.eliminar('ali-99')).toThrow(/al menos un alimento/i);
    });

    it('se recupera automáticamente si el almacenamiento contiene JSON corrupto', () => {
      const almacen = crearAlmacenMemoria();
      almacen.setItem('ags_dieta_catalogo_v1', '{json-roto');
      const repo = CatalogoRepositorio.obtenerInstancia(almacen);
      expect(repo.longitud).toBe(30);
    });
  });

  describe('ConfiguracionGlobal', () => {
    it('inicializa con valores por defecto del anteproyecto y persiste cambios', () => {
      const almacen = crearAlmacenMemoria();
      const cfgA = ConfiguracionGlobal.obtenerInstancia(almacen);
      const cfgB = ConfiguracionGlobal.obtenerInstancia();

      expect(cfgA).toBe(cfgB);
      expect(cfgA.obtenerSnapshot()).toEqual({
        restricciones: RESTRICCIONES_POR_DEFECTO,
        parametros: PARAMETROS_POR_DEFECTO,
      });

      cfgA.actualizarRestricciones({ maxCalorias: 2200, presupuesto: 180 });
      cfgA.actualizarParametros({ cantidadElitismo: 2, semilla: 99 });

      ConfiguracionGlobal.reiniciarInstancia();
      const cfgRecargada = ConfiguracionGlobal.obtenerInstancia(almacen);
      expect(cfgRecargada.obtenerSnapshot().restricciones.maxCalorias).toBe(2200);
      expect(cfgRecargada.obtenerSnapshot().parametros.cantidadElitismo).toBe(2);
      expect(cfgRecargada.obtenerSnapshot().parametros.semilla).toBe(99);

      const restaurada = cfgRecargada.restaurarPorDefecto(25);
      expect(restaurada.restricciones).toEqual(RESTRICCIONES_POR_DEFECTO);
      expect(restaurada.parametros.probabilidadMutacion).toBeCloseTo(0.04, 4);
    });

    it('calcula Pm recomendada 1/N acotada en [0.001, 0.10] y valida límites', () => {
      expect(ConfiguracionGlobal.calcularPmRecomendada(30)).toBeCloseTo(0.0333, 4);
      expect(ConfiguracionGlobal.calcularPmRecomendada(5)).toBe(0.1);
      expect(ConfiguracionGlobal.calcularPmRecomendada(2000)).toBe(0.001);
      expect(() => ConfiguracionGlobal.calcularPmRecomendada(0)).toThrow(RangeError);

      const cfg = ConfiguracionGlobal.obtenerInstancia(null);
      expect(() => cfg.actualizarRestricciones({ maxCalorias: 100 })).toThrow(RangeError);
      expect(() => cfg.actualizarParametros({ tamanoPoblacion: 5 })).toThrow(RangeError);
      expect(() => cfg.actualizarParametros({ probabilidadMutacion: 0.5 })).toThrow(RangeError);
      expect(() => cfg.actualizarParametros({ semilla: -1 })).toThrow(RangeError);
      expect(() => cfg.actualizarParametros({ cantidadElitismo: 50 })).toThrow(RangeError);
    });

    it('restaura valores por defecto si la configuración guardada está corrupta', () => {
      const almacen = crearAlmacenMemoria();
      almacen.setItem('ags_dieta_config_v1', 'invalido');
      const cfg = ConfiguracionGlobal.obtenerInstancia(almacen);
      expect(cfg.obtenerSnapshot().parametros.semilla).toBe(42);
    });
  });
});
