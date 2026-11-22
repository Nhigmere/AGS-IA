import { describe, expect, it } from 'vitest';
import { CategoriaAlimento, type ConfiguracionEjecucion } from '../../models/types';
import { PARAMETROS_POR_DEFECTO, RESTRICCIONES_POR_DEFECTO } from '../../patterns/singleton';
import {
  esFormularioValido,
  validarFormularioAlimento,
  validarFormularioConfiguracion,
} from '../validacion';

const configValida: ConfiguracionEjecucion = {
  restricciones: RESTRICCIONES_POR_DEFECTO,
  parametros: PARAMETROS_POR_DEFECTO,
};

describe('Validación de formularios (Configuración y Catálogo)', () => {
  it('acepta la configuración por defecto sin errores', () => {
    const errores = validarFormularioConfiguracion(configValida);
    expect(esFormularioValido(errores)).toBe(true);
    expect(errores).toEqual({});
  });

  it('detecta campos fuera de rango y reglas cruzadas (torneo y elitismo vs población)', () => {
    const errores = validarFormularioConfiguracion({
      restricciones: { maxCalorias: 100, presupuesto: -10 },
      parametros: {
        ...PARAMETROS_POR_DEFECTO,
        tamanoPoblacion: 10,
        maxGeneraciones: 5,
        probabilidadCruce: 1.5,
        probabilidadMutacion: 0.2,
        tamanoTorneo: 15,
        cantidadElitismo: 10,
        semilla: -5,
      },
    });

    expect(esFormularioValido(errores)).toBe(false);
    expect(errores.maxCalorias).toBeDefined();
    expect(errores.presupuesto).toBeDefined();
    expect(errores.maxGeneraciones).toBeDefined();
    expect(errores.probabilidadCruce).toBeDefined();
    expect(errores.probabilidadMutacion).toBeDefined();
    expect(errores.tamanoTorneo).toBeDefined();
    expect(errores.cantidadElitismo).toBeDefined();
    expect(errores.semilla).toBeDefined();
  });

  it('valida formularios de alta y edición de alimentos', () => {
    const sinErrores = validarFormularioAlimento({
      nombre: 'Quinoa cocida',
      categoria: CategoriaAlimento.CEREALES,
      porcion: '1 taza (185 g)',
      proteina: 8.1,
      calorias: 222,
      costo: 14,
    });
    expect(esFormularioValido(sinErrores)).toBe(true);

    const conErrores = validarFormularioAlimento({
      nombre: '   ',
      categoria: 'Invalida' as CategoriaAlimento,
      porcion: '',
      proteina: -2,
      calorias: Number.NaN,
      costo: -5,
    });
    expect(esFormularioValido(conErrores)).toBe(false);
    expect(Object.keys(conErrores)).toHaveLength(6);
  });
});
