import { FACTOR_PENALIZACION_DEFECTO } from '../../models/Individuo';
import type { ConfiguracionEjecucion, ParametrosAGS, RestriccionesDieta } from '../../models/types';
import { type AlmacenPersistencia, obtenerAlmacenPorDefecto } from './storage';

const CLAVE_STORAGE_CONFIG = 'ags_dieta_config_v1';

export const LIMITES_PARAMETROS = {
  maxCalorias: { min: 500, max: 10000 },
  presupuesto: { min: 10, max: 2000 },
  tamanoPoblacion: { min: 10, max: 500 },
  maxGeneraciones: { min: 10, max: 2000 },
  probabilidadCruce: { min: 0, max: 1 },
  probabilidadMutacion: { min: 0.001, max: 0.1 },
  tamanoTorneo: { min: 2, max: 20 },
  cantidadElitismo: { min: 0, max: 20 },
  probabilidadInicial: { min: 0.05, max: 0.9 },
  factorPenalizacion: { min: 0.00001, max: 0.5 },
  porcentajeEstancamiento: { min: 0, max: 100 },
  epsilonEstancamiento: { min: 0.0001, max: 10 },
  frecuenciaReporte: { min: 1, max: 100 },
} as const;

export const RESTRICCIONES_POR_DEFECTO: RestriccionesDieta = Object.freeze({
  maxCalorias: 2000,
  presupuesto: 150,
});

export const PARAMETROS_POR_DEFECTO: ParametrosAGS = Object.freeze({
  tamanoPoblacion: 50,
  maxGeneraciones: 100,
  probabilidadCruce: 0.8,
  probabilidadMutacion: Number((1 / 30).toFixed(4)),
  tamanoTorneo: 3,
  cantidadElitismo: 0,
  probabilidadInicial: 0.2,
  factorPenalizacion: FACTOR_PENALIZACION_DEFECTO,
  porcentajeEstancamiento: 25,
  epsilonEstancamiento: 0.01,
  semilla: 42,
  frecuenciaReporte: 1,
});

function validarRango(
  valor: number,
  min: number,
  max: number,
  nombre: string,
  requiereEntero = false,
): void {
  if (!Number.isFinite(valor)) {
    throw new RangeError(`El parámetro "${nombre}" debe ser un número finito.`);
  }
  if (requiereEntero && !Number.isInteger(valor)) {
    throw new RangeError(`El parámetro "${nombre}" debe ser un número entero.`);
  }
  if (valor < min || valor > max) {
    throw new RangeError(
      `El parámetro "${nombre}" debe estar en el rango [${min}, ${max}] (recibido: ${valor}).`,
    );
  }
}

export function validarRestriccionesDieta(r: RestriccionesDieta): void {
  validarRango(
    r.maxCalorias,
    LIMITES_PARAMETROS.maxCalorias.min,
    LIMITES_PARAMETROS.maxCalorias.max,
    'maxCalorias',
  );
  validarRango(
    r.presupuesto,
    LIMITES_PARAMETROS.presupuesto.min,
    LIMITES_PARAMETROS.presupuesto.max,
    'presupuesto',
  );
}

export function validarParametrosAGS(p: ParametrosAGS): void {
  validarRango(
    p.tamanoPoblacion,
    LIMITES_PARAMETROS.tamanoPoblacion.min,
    LIMITES_PARAMETROS.tamanoPoblacion.max,
    'tamanoPoblacion',
    true,
  );
  validarRango(
    p.maxGeneraciones,
    LIMITES_PARAMETROS.maxGeneraciones.min,
    LIMITES_PARAMETROS.maxGeneraciones.max,
    'maxGeneraciones',
    true,
  );
  validarRango(
    p.probabilidadCruce,
    LIMITES_PARAMETROS.probabilidadCruce.min,
    LIMITES_PARAMETROS.probabilidadCruce.max,
    'probabilidadCruce',
  );
  validarRango(
    p.probabilidadMutacion,
    LIMITES_PARAMETROS.probabilidadMutacion.min,
    LIMITES_PARAMETROS.probabilidadMutacion.max,
    'probabilidadMutacion',
  );
  validarRango(
    p.tamanoTorneo,
    LIMITES_PARAMETROS.tamanoTorneo.min,
    Math.min(LIMITES_PARAMETROS.tamanoTorneo.max, p.tamanoPoblacion),
    'tamanoTorneo',
    true,
  );
  validarRango(
    p.cantidadElitismo,
    LIMITES_PARAMETROS.cantidadElitismo.min,
    Math.min(LIMITES_PARAMETROS.cantidadElitismo.max, p.tamanoPoblacion - 1),
    'cantidadElitismo',
    true,
  );
  validarRango(
    p.probabilidadInicial,
    LIMITES_PARAMETROS.probabilidadInicial.min,
    LIMITES_PARAMETROS.probabilidadInicial.max,
    'probabilidadInicial',
  );
  validarRango(
    p.factorPenalizacion,
    LIMITES_PARAMETROS.factorPenalizacion.min,
    LIMITES_PARAMETROS.factorPenalizacion.max,
    'factorPenalizacion',
  );
  validarRango(
    p.porcentajeEstancamiento,
    LIMITES_PARAMETROS.porcentajeEstancamiento.min,
    LIMITES_PARAMETROS.porcentajeEstancamiento.max,
    'porcentajeEstancamiento',
  );
  validarRango(
    p.epsilonEstancamiento,
    LIMITES_PARAMETROS.epsilonEstancamiento.min,
    LIMITES_PARAMETROS.epsilonEstancamiento.max,
    'epsilonEstancamiento',
  );
  if (!Number.isInteger(p.semilla) || p.semilla < 0) {
    throw new RangeError('La semilla debe ser un entero mayor o igual a 0.');
  }
  validarRango(
    p.frecuenciaReporte,
    LIMITES_PARAMETROS.frecuenciaReporte.min,
    LIMITES_PARAMETROS.frecuenciaReporte.max,
    'frecuenciaReporte',
    true,
  );
}

/**
 * Singleton que administra las restricciones dietéticas y parámetros del AGS.
 * Expone snapshots inmutables listos para enviarse al Web Worker.
 */
export class ConfiguracionGlobal {
  private static instancia: ConfiguracionGlobal | null = null;

  private restricciones: RestriccionesDieta = { ...RESTRICCIONES_POR_DEFECTO };
  private parametros: ParametrosAGS = { ...PARAMETROS_POR_DEFECTO };
  private readonly almacen: AlmacenPersistencia | null;

  private constructor(almacen: AlmacenPersistencia | null) {
    this.almacen = almacen;
    this.cargarPersistida();
  }

  public static obtenerInstancia(almacen?: AlmacenPersistencia | null): ConfiguracionGlobal {
    if (ConfiguracionGlobal.instancia === null) {
      const destino = almacen === undefined ? obtenerAlmacenPorDefecto() : almacen;
      ConfiguracionGlobal.instancia = new ConfiguracionGlobal(destino);
    }
    return ConfiguracionGlobal.instancia;
  }

  public static reiniciarInstancia(): void {
    ConfiguracionGlobal.instancia = null;
  }

  /** Calcula la tasa de mutación recomendada 1/N acotada al rango permitido [0.001, 0.10]. */
  public static calcularPmRecomendada(numeroAlimentos: number): number {
    if (!Number.isInteger(numeroAlimentos) || numeroAlimentos < 1) {
      throw new RangeError('El número de alimentos N debe ser un entero mayor o igual a 1.');
    }
    const cruda = 1 / numeroAlimentos;
    const acotada = Math.min(
      LIMITES_PARAMETROS.probabilidadMutacion.max,
      Math.max(LIMITES_PARAMETROS.probabilidadMutacion.min, cruda),
    );
    return Number(acotada.toFixed(4));
  }

  private cargarPersistida(): void {
    if (!this.almacen) return;
    try {
      const crudo = this.almacen.getItem(CLAVE_STORAGE_CONFIG);
      if (!crudo) return;
      const parsed = JSON.parse(crudo) as Partial<ConfiguracionEjecucion>;
      if (parsed.restricciones && parsed.parametros) {
        const candidatasRestricciones = { ...RESTRICCIONES_POR_DEFECTO, ...parsed.restricciones };
        const candidatosParametros = { ...PARAMETROS_POR_DEFECTO, ...parsed.parametros };
        validarRestriccionesDieta(candidatasRestricciones);
        validarParametrosAGS(candidatosParametros);
        this.restricciones = candidatasRestricciones;
        this.parametros = candidatosParametros;
      }
    } catch {
      this.restricciones = { ...RESTRICCIONES_POR_DEFECTO };
      this.parametros = { ...PARAMETROS_POR_DEFECTO };
    }
  }

  private persistir(): void {
    if (!this.almacen) return;
    try {
      this.almacen.setItem(CLAVE_STORAGE_CONFIG, JSON.stringify(this.obtenerSnapshot()));
    } catch {
      // Ignora errores de cuota en storage.
    }
  }

  public obtenerSnapshot(): ConfiguracionEjecucion {
    return {
      restricciones: { ...this.restricciones },
      parametros: { ...this.parametros },
    };
  }

  public actualizarRestricciones(parcial: Partial<RestriccionesDieta>): ConfiguracionEjecucion {
    const siguientes: RestriccionesDieta = { ...this.restricciones, ...parcial };
    validarRestriccionesDieta(siguientes);
    this.restricciones = siguientes;
    this.persistir();
    return this.obtenerSnapshot();
  }

  public actualizarParametros(parcial: Partial<ParametrosAGS>): ConfiguracionEjecucion {
    const siguientes: ParametrosAGS = { ...this.parametros, ...parcial };
    validarParametrosAGS(siguientes);
    this.parametros = siguientes;
    this.persistir();
    return this.obtenerSnapshot();
  }

  public restaurarPorDefecto(numeroAlimentos?: number): ConfiguracionEjecucion {
    this.restricciones = { ...RESTRICCIONES_POR_DEFECTO };
    this.parametros = {
      ...PARAMETROS_POR_DEFECTO,
      probabilidadMutacion:
        numeroAlimentos !== undefined
          ? ConfiguracionGlobal.calcularPmRecomendada(numeroAlimentos)
          : PARAMETROS_POR_DEFECTO.probabilidadMutacion,
    };
    if (this.almacen) {
      try {
        this.almacen.removeItem(CLAVE_STORAGE_CONFIG);
      } catch {
        // Sin efecto si no se puede limpiar.
      }
    }
    return this.obtenerSnapshot();
  }
}
