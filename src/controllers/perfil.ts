import {
  AJUSTE_CALORICO_OBJETIVO,
  calcularAvanceEnDia,
  calcularEvaluacionCorporal,
  calcularPosicionTermometro,
  calcularProyeccionConMenu,
  desglosarDias,
  FACTORES_ACTIVIDAD,
  generarHitosProyeccion,
  IMC_ESCALA_MAX,
  IMC_ESCALA_MIN,
  KCAL_POR_KG,
  LIMITES_PERFIL,
  PERFIL_POR_DEFECTO,
  PISO_CALORICO_SEGURO,
  PROTEINA_POR_KG_OBJETIVO,
  resolverModoGasto,
} from '../models/CalculadoraCorporal';
import type { NivelActividad, ObjetivoFisico, PerfilUsuario } from '../models/types';

export {
  AJUSTE_CALORICO_OBJETIVO,
  calcularAvanceEnDia,
  calcularEvaluacionCorporal,
  calcularPosicionTermometro,
  calcularProyeccionConMenu,
  desglosarDias,
  FACTORES_ACTIVIDAD,
  generarHitosProyeccion,
  IMC_ESCALA_MAX,
  IMC_ESCALA_MIN,
  KCAL_POR_KG,
  LIMITES_PERFIL,
  PERFIL_POR_DEFECTO,
  PISO_CALORICO_SEGURO,
  PROTEINA_POR_KG_OBJETIVO,
  resolverModoGasto,
};

export interface OpcionActividadUI {
  readonly valor: NivelActividad;
  readonly etiqueta: string;
  readonly descripcion: string;
  readonly factor: number;
}

export const OPCIONES_ACTIVIDAD: readonly OpcionActividadUI[] = [
  {
    valor: 'sedentario',
    etiqueta: 'Sedentario',
    descripcion: 'Trabajo de escritorio, poco o nada de ejercicio',
    factor: FACTORES_ACTIVIDAD.sedentario,
  },
  {
    valor: 'ligero',
    etiqueta: 'Ligero',
    descripcion: 'Ejercicio suave 1–3 días por semana',
    factor: FACTORES_ACTIVIDAD.ligero,
  },
  {
    valor: 'moderado',
    etiqueta: 'Moderado',
    descripcion: 'Ejercicio moderado 3–5 días por semana',
    factor: FACTORES_ACTIVIDAD.moderado,
  },
  {
    valor: 'activo',
    etiqueta: 'Activo',
    descripcion: 'Entrenamiento intenso 6–7 días por semana',
    factor: FACTORES_ACTIVIDAD.activo,
  },
  {
    valor: 'muy_activo',
    etiqueta: 'Muy activo',
    descripcion: 'Entrenamiento doble o trabajo físico exigente',
    factor: FACTORES_ACTIVIDAD.muy_activo,
  },
];

export interface OpcionObjetivoUI {
  readonly valor: ObjetivoFisico;
  readonly etiqueta: string;
  readonly resumen: string;
  readonly ajusteTexto: string;
}

export const OPCIONES_OBJETIVO: readonly OpcionObjetivoUI[] = [
  {
    valor: 'bajar',
    etiqueta: 'Bajar de peso',
    resumen: 'Déficit calórico controlado priorizando proteína para cuidar músculo',
    ajusteTexto: '-400 kcal',
  },
  {
    valor: 'mantener',
    etiqueta: 'Mantener peso',
    resumen: 'Equilibrio calórico diario maximizando aporte proteico',
    ajusteTexto: '0 kcal',
  },
  {
    valor: 'ganar',
    etiqueta: 'Ganar masa muscular',
    resumen: 'Superávit calórico ligero enfocado en alta proteína diaria',
    ajusteTexto: '+300 kcal',
  },
];

export function obtenerEtiquetaObjetivo(objetivo: ObjetivoFisico): string {
  return OPCIONES_OBJETIVO.find((o) => o.valor === objetivo)?.etiqueta ?? objetivo;
}

export const PRESETS_DEFICIT = [
  { valor: 250, etiqueta: 'Suave', descripcion: '-250 kcal/día · ~0.23 kg/sem' },
  { valor: 400, etiqueta: 'Moderado', descripcion: '-400 kcal/día · ~0.36 kg/sem' },
  { valor: 600, etiqueta: 'Rápido', descripcion: '-600 kcal/día · ~0.55 kg/sem' },
  { valor: 750, etiqueta: 'Intenso', descripcion: '-750 kcal/día · ~0.68 kg/sem' },
] as const;

export const PRESETS_SUPERAVIT = [
  { valor: 200, etiqueta: 'Limpio', descripcion: '+200 kcal/día · ~0.18 kg/sem' },
  { valor: 300, etiqueta: 'Moderado', descripcion: '+300 kcal/día · ~0.27 kg/sem' },
  { valor: 450, etiqueta: 'Volumen', descripcion: '+450 kcal/día · ~0.41 kg/sem' },
] as const;

export type CampoPerfil =
  | 'pesoKg'
  | 'estaturaCm'
  | 'edad'
  | 'presupuestoDiario'
  | 'pesoMetaKg'
  | 'caloriasActivasReloj'
  | 'caloriasDescansoReloj'
  | 'diasEntrenoSemana'
  | 'caloriasQuemadasDia'
  | 'ajusteCaloricoPersonalizado';
export type ErroresPerfil = Partial<Record<CampoPerfil, string>>;

export function validarFormularioPerfil(perfil: PerfilUsuario): ErroresPerfil {
  const errores: ErroresPerfil = {};

  if (
    !Number.isFinite(perfil.pesoKg) ||
    perfil.pesoKg < LIMITES_PERFIL.pesoKg.min ||
    perfil.pesoKg > LIMITES_PERFIL.pesoKg.max
  ) {
    errores.pesoKg = `Ingresa un peso entre ${LIMITES_PERFIL.pesoKg.min} y ${LIMITES_PERFIL.pesoKg.max} kg.`;
  }

  if (
    !Number.isFinite(perfil.estaturaCm) ||
    perfil.estaturaCm < LIMITES_PERFIL.estaturaCm.min ||
    perfil.estaturaCm > LIMITES_PERFIL.estaturaCm.max
  ) {
    errores.estaturaCm = `Ingresa una estatura entre ${LIMITES_PERFIL.estaturaCm.min} y ${LIMITES_PERFIL.estaturaCm.max} cm.`;
  }

  if (
    !Number.isInteger(perfil.edad) ||
    perfil.edad < LIMITES_PERFIL.edad.min ||
    perfil.edad > LIMITES_PERFIL.edad.max
  ) {
    errores.edad = `Ingresa una edad entera entre ${LIMITES_PERFIL.edad.min} y ${LIMITES_PERFIL.edad.max} años.`;
  }

  if (
    !Number.isFinite(perfil.presupuestoDiario) ||
    perfil.presupuestoDiario < LIMITES_PERFIL.presupuestoDiario.min ||
    perfil.presupuestoDiario > LIMITES_PERFIL.presupuestoDiario.max
  ) {
    errores.presupuestoDiario = `El presupuesto debe estar entre $${LIMITES_PERFIL.presupuestoDiario.min} y $${LIMITES_PERFIL.presupuestoDiario.max} MXN.`;
  }

  if (
    perfil.pesoMetaKg !== undefined &&
    perfil.pesoMetaKg !== null &&
    (!Number.isFinite(perfil.pesoMetaKg) ||
      perfil.pesoMetaKg < LIMITES_PERFIL.pesoKg.min ||
      perfil.pesoMetaKg > LIMITES_PERFIL.pesoKg.max)
  ) {
    errores.pesoMetaKg = `Ingresa un peso meta entre ${LIMITES_PERFIL.pesoKg.min} y ${LIMITES_PERFIL.pesoKg.max} kg.`;
  }

  if (
    perfil.caloriasActivasReloj !== undefined &&
    perfil.caloriasActivasReloj !== null &&
    (!Number.isFinite(perfil.caloriasActivasReloj) ||
      perfil.caloriasActivasReloj < LIMITES_PERFIL.caloriasActivasReloj.min ||
      perfil.caloriasActivasReloj > LIMITES_PERFIL.caloriasActivasReloj.max)
  ) {
    errores.caloriasActivasReloj = `Ingresa entre ${LIMITES_PERFIL.caloriasActivasReloj.min} y ${LIMITES_PERFIL.caloriasActivasReloj.max} kcal extras.`;
  }

  if (
    perfil.caloriasDescansoReloj !== undefined &&
    perfil.caloriasDescansoReloj !== null &&
    (!Number.isFinite(perfil.caloriasDescansoReloj) ||
      perfil.caloriasDescansoReloj < LIMITES_PERFIL.caloriasDescansoReloj.min ||
      perfil.caloriasDescansoReloj > LIMITES_PERFIL.caloriasDescansoReloj.max)
  ) {
    errores.caloriasDescansoReloj = `Ingresa entre ${LIMITES_PERFIL.caloriasDescansoReloj.min} y ${LIMITES_PERFIL.caloriasDescansoReloj.max} kcal en descanso.`;
  }

  if (
    perfil.diasEntrenoSemana !== undefined &&
    (!Number.isInteger(perfil.diasEntrenoSemana) ||
      perfil.diasEntrenoSemana < LIMITES_PERFIL.diasEntrenoSemana.min ||
      perfil.diasEntrenoSemana > LIMITES_PERFIL.diasEntrenoSemana.max)
  ) {
    errores.diasEntrenoSemana = 'Selecciona entre 1 y 7 días por semana.';
  }

  if (
    perfil.caloriasQuemadasDia !== undefined &&
    perfil.caloriasQuemadasDia !== null &&
    (!Number.isFinite(perfil.caloriasQuemadasDia) ||
      perfil.caloriasQuemadasDia < LIMITES_PERFIL.caloriasQuemadasDia.min ||
      perfil.caloriasQuemadasDia > LIMITES_PERFIL.caloriasQuemadasDia.max)
  ) {
    errores.caloriasQuemadasDia = `Ingresa un gasto entre ${LIMITES_PERFIL.caloriasQuemadasDia.min} y ${LIMITES_PERFIL.caloriasQuemadasDia.max} kcal/día.`;
  }

  if (
    perfil.ajusteCaloricoPersonalizado !== undefined &&
    perfil.ajusteCaloricoPersonalizado !== null
  ) {
    const absVal = Math.abs(perfil.ajusteCaloricoPersonalizado);
    const rango =
      perfil.objetivo === 'ganar' ? LIMITES_PERFIL.superavitDiario : LIMITES_PERFIL.deficitDiario;
    if (!Number.isFinite(absVal) || absVal < rango.min || absVal > rango.max) {
      errores.ajusteCaloricoPersonalizado = `Ajuste permitido: entre ${rango.min} y ${rango.max} kcal/día.`;
    }
  }

  return errores;
}
