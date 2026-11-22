import { Alimento } from '../models/Alimento';
import {
  CATEGORIAS_ALIMENTO,
  type ConfiguracionEjecucion,
  type DatosAlimento,
  type ParametrosAGS,
  type RestriccionesDieta,
} from '../models/types';
import { ConfiguracionGlobal, LIMITES_PARAMETROS } from '../patterns/singleton';

export { CATEGORIAS_ALIMENTO, LIMITES_PARAMETROS };

export function calcularPmRecomendada(numeroAlimentos: number): number {
  return ConfiguracionGlobal.calcularPmRecomendada(numeroAlimentos);
}

export type CampoConfiguracion = keyof RestriccionesDieta | keyof ParametrosAGS;

export type ErroresConfiguracion = Partial<Record<CampoConfiguracion, string>>;

export type CampoAlimento = keyof Omit<DatosAlimento, 'id'>;

export type ErroresAlimento = Partial<Record<CampoAlimento, string>>;

function validarNumeroEnRango(
  valor: number,
  min: number,
  max: number,
  etiqueta: string,
  entero = false,
): string | undefined {
  if (!Number.isFinite(valor)) {
    return `${etiqueta} debe ser un número válido.`;
  }
  if (entero && !Number.isInteger(valor)) {
    return `${etiqueta} debe ser un número entero.`;
  }
  if (valor < min || valor > max) {
    return `${etiqueta} debe estar entre ${min} y ${max}.`;
  }
  return undefined;
}

/**
 * Valida en vivo todos los campos de restricciones y parámetros del AGS,
 * devolviendo mensajes en español junto a cada campo inválido.
 */
export function validarFormularioConfiguracion(
  config: ConfiguracionEjecucion,
): ErroresConfiguracion {
  const errores: ErroresConfiguracion = {};
  const { restricciones: r, parametros: p } = config;

  const asignar = (campo: CampoConfiguracion, mensaje?: string): void => {
    if (mensaje) errores[campo] = mensaje;
  };

  asignar(
    'maxCalorias',
    validarNumeroEnRango(
      r.maxCalorias,
      LIMITES_PARAMETROS.maxCalorias.min,
      LIMITES_PARAMETROS.maxCalorias.max,
      'El límite de calorías',
    ),
  );
  asignar(
    'presupuesto',
    validarNumeroEnRango(
      r.presupuesto,
      LIMITES_PARAMETROS.presupuesto.min,
      LIMITES_PARAMETROS.presupuesto.max,
      'El presupuesto',
    ),
  );
  asignar(
    'tamanoPoblacion',
    validarNumeroEnRango(
      p.tamanoPoblacion,
      LIMITES_PARAMETROS.tamanoPoblacion.min,
      LIMITES_PARAMETROS.tamanoPoblacion.max,
      'El tamaño de población',
      true,
    ),
  );
  asignar(
    'maxGeneraciones',
    validarNumeroEnRango(
      p.maxGeneraciones,
      LIMITES_PARAMETROS.maxGeneraciones.min,
      LIMITES_PARAMETROS.maxGeneraciones.max,
      'El máximo de generaciones',
      true,
    ),
  );
  asignar(
    'probabilidadCruce',
    validarNumeroEnRango(
      p.probabilidadCruce,
      LIMITES_PARAMETROS.probabilidadCruce.min,
      LIMITES_PARAMETROS.probabilidadCruce.max,
      'La probabilidad de cruce (Pc)',
    ),
  );
  asignar(
    'probabilidadMutacion',
    validarNumeroEnRango(
      p.probabilidadMutacion,
      LIMITES_PARAMETROS.probabilidadMutacion.min,
      LIMITES_PARAMETROS.probabilidadMutacion.max,
      'La probabilidad de mutación (Pm)',
    ),
  );

  const maxTorneo = Math.min(LIMITES_PARAMETROS.tamanoTorneo.max, p.tamanoPoblacion);
  asignar(
    'tamanoTorneo',
    validarNumeroEnRango(
      p.tamanoTorneo,
      LIMITES_PARAMETROS.tamanoTorneo.min,
      Math.max(LIMITES_PARAMETROS.tamanoTorneo.min, maxTorneo),
      'El tamaño de torneo (k)',
      true,
    ),
  );

  const maxElitismo = Math.min(LIMITES_PARAMETROS.cantidadElitismo.max, p.tamanoPoblacion - 1);
  asignar(
    'cantidadElitismo',
    validarNumeroEnRango(
      p.cantidadElitismo,
      LIMITES_PARAMETROS.cantidadElitismo.min,
      Math.max(0, maxElitismo),
      'El elitismo (e)',
      true,
    ),
  );

  asignar(
    'probabilidadInicial',
    validarNumeroEnRango(
      p.probabilidadInicial,
      LIMITES_PARAMETROS.probabilidadInicial.min,
      LIMITES_PARAMETROS.probabilidadInicial.max,
      'La probabilidad inicial',
    ),
  );
  asignar(
    'factorPenalizacion',
    validarNumeroEnRango(
      p.factorPenalizacion,
      LIMITES_PARAMETROS.factorPenalizacion.min,
      LIMITES_PARAMETROS.factorPenalizacion.max,
      'El factor de penalización',
    ),
  );
  asignar(
    'porcentajeEstancamiento',
    validarNumeroEnRango(
      p.porcentajeEstancamiento,
      LIMITES_PARAMETROS.porcentajeEstancamiento.min,
      LIMITES_PARAMETROS.porcentajeEstancamiento.max,
      'El porcentaje de estancamiento',
    ),
  );
  asignar(
    'epsilonEstancamiento',
    validarNumeroEnRango(
      p.epsilonEstancamiento,
      LIMITES_PARAMETROS.epsilonEstancamiento.min,
      LIMITES_PARAMETROS.epsilonEstancamiento.max,
      'El umbral épsilon',
    ),
  );

  if (!Number.isInteger(p.semilla) || p.semilla < 0) {
    errores.semilla = 'La semilla debe ser un número entero mayor o igual a 0.';
  }

  asignar(
    'frecuenciaReporte',
    validarNumeroEnRango(
      p.frecuenciaReporte,
      LIMITES_PARAMETROS.frecuenciaReporte.min,
      LIMITES_PARAMETROS.frecuenciaReporte.max,
      'La frecuencia de reporte',
      true,
    ),
  );

  return errores;
}

export function esFormularioValido(errores: Record<string, string | undefined>): boolean {
  return Object.values(errores).every((msg) => msg === undefined);
}

/**
 * Valida los campos del formulario de alta/edición de un alimento del catálogo.
 */
export function validarFormularioAlimento(datos: Omit<DatosAlimento, 'id'>): ErroresAlimento {
  const errores: ErroresAlimento = {};

  if (datos.nombre.trim().length === 0) {
    errores.nombre = 'El nombre es obligatorio.';
  }
  if (!Alimento.esCategoriaValida(datos.categoria)) {
    errores.categoria = 'Selecciona una categoría válida.';
  }
  if (datos.porcion.trim().length === 0) {
    errores.porcion = 'Especifica la porción estándar (ej. "100 g").';
  }
  if (!Number.isFinite(datos.proteina) || datos.proteina < 0) {
    errores.proteina = 'La proteína debe ser un número ≥ 0.';
  }
  if (!Number.isFinite(datos.calorias) || datos.calorias < 0) {
    errores.calorias = 'Las calorías deben ser un número ≥ 0.';
  }
  if (!Number.isFinite(datos.costo) || datos.costo < 0) {
    errores.costo = 'El costo debe ser un número ≥ 0.';
  }

  return errores;
}
