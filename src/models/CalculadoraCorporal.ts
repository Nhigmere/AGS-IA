import type {
  AvanceEnDia,
  CategoriaIMC,
  DesgloseTiempo,
  EvaluacionCorporal,
  HitoProyeccion,
  ModoGastoDiario,
  NivelActividad,
  ObjetivoFisico,
  PerfilUsuario,
  ProyeccionObjetivo,
  SexoBiologico,
} from './types';

/** Equivalencia calórica estándar por kilogramo de masa grasa corporal (regla de Wishnofsky). */
export const KCAL_POR_KG = 7700;

export const LIMITES_PERFIL = {
  pesoKg: { min: 30, max: 250 },
  estaturaCm: { min: 120, max: 230 },
  edad: { min: 14, max: 100 },
  presupuestoDiario: { min: 10, max: 2000 },
  caloriasActivasReloj: { min: 0, max: 3500 },
  caloriasDescansoReloj: { min: 0, max: 3500 },
  diasEntrenoSemana: { min: 1, max: 7 },
  caloriasQuemadasDia: { min: 800, max: 8000 },
  deficitDiario: { min: 100, max: 1000 },
  superavitDiario: { min: 100, max: 600 },
  caloriasAGS: { min: 500, max: 10000 },
} as const;

export const FACTORES_ACTIVIDAD: Record<NivelActividad, number> = Object.freeze({
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  activo: 1.725,
  muy_activo: 1.9,
});

export const AJUSTE_CALORICO_OBJETIVO: Record<ObjetivoFisico, number> = Object.freeze({
  bajar: -400,
  mantener: 0,
  ganar: 300,
});

export const PROTEINA_POR_KG_OBJETIVO: Record<ObjetivoFisico, number> = Object.freeze({
  bajar: 1.8,
  mantener: 1.4,
  ganar: 2.0,
});

export const PISO_CALORICO_SEGURO: Record<SexoBiologico, number> = Object.freeze({
  hombre: 1500,
  mujer: 1200,
});

export const PERFIL_POR_DEFECTO: PerfilUsuario = Object.freeze({
  pesoKg: 74,
  estaturaCm: 172,
  edad: 22,
  sexo: 'hombre',
  nivelActividad: 'moderado',
  objetivo: 'mantener',
  presupuestoDiario: 150,
  pesoMetaKg: null,
  modoGasto: 'actividad',
  caloriasActivasReloj: 500,
  diasEntrenoSemana: 5,
  caloriasDescansoReloj: 200,
  caloriasQuemadasDia: null,
  ajusteCaloricoPersonalizado: null,
});

export const IMC_ESCALA_MIN = 14;
export const IMC_ESCALA_MAX = 40;

const SEXOS_VALIDOS: readonly SexoBiologico[] = ['hombre', 'mujer'];
const ACTIVIDADES_VALIDAS: readonly NivelActividad[] = [
  'sedentario',
  'ligero',
  'moderado',
  'activo',
  'muy_activo',
];
const OBJETIVOS_VALIDOS: readonly ObjetivoFisico[] = ['bajar', 'mantener', 'ganar'];
const MODOS_GASTO_VALIDOS: readonly ModoGastoDiario[] = ['actividad', 'reloj', 'total_manual'];

export function resolverModoGasto(perfil: PerfilUsuario): ModoGastoDiario {
  if (perfil.modoGasto && MODOS_GASTO_VALIDOS.includes(perfil.modoGasto)) {
    return perfil.modoGasto;
  }
  return perfil.caloriasQuemadasDia !== undefined && perfil.caloriasQuemadasDia !== null
    ? 'total_manual'
    : 'actividad';
}

function redondear(valor: number, decimales = 1): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

export function validarPerfilUsuario(perfil: PerfilUsuario): void {
  if (
    !Number.isFinite(perfil.pesoKg) ||
    perfil.pesoKg < LIMITES_PERFIL.pesoKg.min ||
    perfil.pesoKg > LIMITES_PERFIL.pesoKg.max
  ) {
    throw new RangeError(
      `El peso debe estar entre ${LIMITES_PERFIL.pesoKg.min} y ${LIMITES_PERFIL.pesoKg.max} kg.`,
    );
  }
  if (
    !Number.isFinite(perfil.estaturaCm) ||
    perfil.estaturaCm < LIMITES_PERFIL.estaturaCm.min ||
    perfil.estaturaCm > LIMITES_PERFIL.estaturaCm.max
  ) {
    throw new RangeError(
      `La estatura debe estar entre ${LIMITES_PERFIL.estaturaCm.min} y ${LIMITES_PERFIL.estaturaCm.max} cm.`,
    );
  }
  if (
    !Number.isInteger(perfil.edad) ||
    perfil.edad < LIMITES_PERFIL.edad.min ||
    perfil.edad > LIMITES_PERFIL.edad.max
  ) {
    throw new RangeError(
      `La edad debe ser un entero entre ${LIMITES_PERFIL.edad.min} y ${LIMITES_PERFIL.edad.max} años.`,
    );
  }
  if (!SEXOS_VALIDOS.includes(perfil.sexo)) {
    throw new RangeError(`Sexo biológico inválido: "${String(perfil.sexo)}".`);
  }
  if (!ACTIVIDADES_VALIDAS.includes(perfil.nivelActividad)) {
    throw new RangeError(`Nivel de actividad inválido: "${String(perfil.nivelActividad)}".`);
  }
  if (!OBJETIVOS_VALIDOS.includes(perfil.objetivo)) {
    throw new RangeError(`Objetivo físico inválido: "${String(perfil.objetivo)}".`);
  }
  if (
    !Number.isFinite(perfil.presupuestoDiario) ||
    perfil.presupuestoDiario < LIMITES_PERFIL.presupuestoDiario.min ||
    perfil.presupuestoDiario > LIMITES_PERFIL.presupuestoDiario.max
  ) {
    throw new RangeError(
      `El presupuesto diario debe estar entre $${LIMITES_PERFIL.presupuestoDiario.min} y $${LIMITES_PERFIL.presupuestoDiario.max} MXN.`,
    );
  }
  if (
    perfil.pesoMetaKg !== undefined &&
    perfil.pesoMetaKg !== null &&
    (!Number.isFinite(perfil.pesoMetaKg) ||
      perfil.pesoMetaKg < LIMITES_PERFIL.pesoKg.min ||
      perfil.pesoMetaKg > LIMITES_PERFIL.pesoKg.max)
  ) {
    throw new RangeError(
      `El peso meta debe estar entre ${LIMITES_PERFIL.pesoKg.min} y ${LIMITES_PERFIL.pesoKg.max} kg.`,
    );
  }
  if (
    perfil.modoGasto !== undefined &&
    !MODOS_GASTO_VALIDOS.includes(perfil.modoGasto)
  ) {
    throw new RangeError(`Modo de gasto inválido: "${String(perfil.modoGasto)}".`);
  }
  if (
    perfil.caloriasActivasReloj !== undefined &&
    perfil.caloriasActivasReloj !== null &&
    (!Number.isFinite(perfil.caloriasActivasReloj) ||
      perfil.caloriasActivasReloj < LIMITES_PERFIL.caloriasActivasReloj.min ||
      perfil.caloriasActivasReloj > LIMITES_PERFIL.caloriasActivasReloj.max)
  ) {
    throw new RangeError(
      `Las calorías activas del reloj deben estar entre ${LIMITES_PERFIL.caloriasActivasReloj.min} y ${LIMITES_PERFIL.caloriasActivasReloj.max} kcal.`,
    );
  }
  if (
    perfil.caloriasDescansoReloj !== undefined &&
    perfil.caloriasDescansoReloj !== null &&
    (!Number.isFinite(perfil.caloriasDescansoReloj) ||
      perfil.caloriasDescansoReloj < LIMITES_PERFIL.caloriasDescansoReloj.min ||
      perfil.caloriasDescansoReloj > LIMITES_PERFIL.caloriasDescansoReloj.max)
  ) {
    throw new RangeError(
      `Las calorías en días de descanso deben estar entre ${LIMITES_PERFIL.caloriasDescansoReloj.min} y ${LIMITES_PERFIL.caloriasDescansoReloj.max} kcal.`,
    );
  }
  if (
    perfil.diasEntrenoSemana !== undefined &&
    (!Number.isInteger(perfil.diasEntrenoSemana) ||
      perfil.diasEntrenoSemana < LIMITES_PERFIL.diasEntrenoSemana.min ||
      perfil.diasEntrenoSemana > LIMITES_PERFIL.diasEntrenoSemana.max)
  ) {
    throw new RangeError(
      `Los días de entrenamiento por semana deben ser un entero entre ${LIMITES_PERFIL.diasEntrenoSemana.min} y ${LIMITES_PERFIL.diasEntrenoSemana.max}.`,
    );
  }
  if (
    perfil.caloriasQuemadasDia !== undefined &&
    perfil.caloriasQuemadasDia !== null &&
    (!Number.isFinite(perfil.caloriasQuemadasDia) ||
      perfil.caloriasQuemadasDia < LIMITES_PERFIL.caloriasQuemadasDia.min ||
      perfil.caloriasQuemadasDia > LIMITES_PERFIL.caloriasQuemadasDia.max)
  ) {
    throw new RangeError(
      `Las calorías quemadas al día deben estar entre ${LIMITES_PERFIL.caloriasQuemadasDia.min} y ${LIMITES_PERFIL.caloriasQuemadasDia.max} kcal.`,
    );
  }
  if (
    perfil.ajusteCaloricoPersonalizado !== undefined &&
    perfil.ajusteCaloricoPersonalizado !== null
  ) {
    const absAjuste = Math.abs(perfil.ajusteCaloricoPersonalizado);
    const rango =
      perfil.objetivo === 'ganar' ? LIMITES_PERFIL.superavitDiario : LIMITES_PERFIL.deficitDiario;
    if (!Number.isFinite(absAjuste) || absAjuste < rango.min || absAjuste > rango.max) {
      throw new RangeError(
        `El ajuste calórico diario debe estar entre ${rango.min} y ${rango.max} kcal.`,
      );
    }
  }
}

export function clasificarIMC(imc: number): { categoria: CategoriaIMC; etiqueta: string } {
  if (imc < 18.5) {
    return { categoria: 'bajo_peso', etiqueta: 'Bajo peso' };
  }
  if (imc < 25) {
    return { categoria: 'saludable', etiqueta: 'Peso saludable' };
  }
  if (imc < 30) {
    return { categoria: 'sobrepeso', etiqueta: 'Sobrepeso' };
  }
  if (imc < 35) {
    return { categoria: 'obesidad_1', etiqueta: 'Obesidad grado I' };
  }
  return { categoria: 'obesidad_2_3', etiqueta: 'Obesidad grado II / III' };
}

/**
 * Mapea un IMC a una posición porcentual [0, 100] sobre la escala del termómetro
 * [IMC_ESCALA_MIN = 14, IMC_ESCALA_MAX = 40].
 */
export function calcularPosicionTermometro(imc: number): number {
  const acotado = Math.min(IMC_ESCALA_MAX, Math.max(IMC_ESCALA_MIN, imc));
  const porcentaje = ((acotado - IMC_ESCALA_MIN) / (IMC_ESCALA_MAX - IMC_ESCALA_MIN)) * 100;
  return redondear(porcentaje, 1);
}

/**
 * Calcula de forma determinista el IMC (OMS), el rango de peso saludable,
 * el peso ideal de referencia (IMC 21.7), la TMB (Mifflin-St Jeor), el GET (TDEE),
 * las calorías objetivo según la meta y la proteína diaria sugerida.
 */
export function calcularEvaluacionCorporal(perfil: PerfilUsuario): EvaluacionCorporal {
  validarPerfilUsuario(perfil);

  const alturaM = perfil.estaturaCm / 100;
  const altura2 = alturaM * alturaM;

  const imcCrudo = perfil.pesoKg / altura2;
  const imc = redondear(imcCrudo, 1);
  const { categoria: categoriaIMC, etiqueta: etiquetaIMC } = clasificarIMC(imcCrudo);

  const pesoMinSaludable = redondear(18.5 * altura2, 1);
  const pesoMaxSaludable = redondear(24.9 * altura2, 1);
  const pesoIdeal = redondear(21.7 * altura2, 1);

  let diferenciaKgRango = 0;
  if (perfil.pesoKg < pesoMinSaludable) {
    diferenciaKgRango = redondear(perfil.pesoKg - pesoMinSaludable, 1);
  } else if (perfil.pesoKg > pesoMaxSaludable) {
    diferenciaKgRango = redondear(perfil.pesoKg - pesoMaxSaludable, 1);
  }

  const diferenciaKgIdeal = redondear(perfil.pesoKg - pesoIdeal, 1);

  // Ecuación de Mifflin-St Jeor + gasto diario según modo (actividad, TMB + extras semanales o total manual)
  const constanteSexo = perfil.sexo === 'hombre' ? 5 : -161;
  const tmb = Math.round(10 * perfil.pesoKg + 6.25 * perfil.estaturaCm - 5 * perfil.edad + constanteSexo);
  const tdeeEstimado = Math.round(tmb * FACTORES_ACTIVIDAD[perfil.nivelActividad]);
  const modoGastoAplicado = resolverModoGasto(perfil);
  const diasEntrenoSemana = perfil.diasEntrenoSemana ?? 7;

  let tdee = tdeeEstimado;
  let caloriasDiaEntreno = tdeeEstimado;
  let caloriasDiaDescanso = tdeeEstimado;

  if (modoGastoAplicado === 'reloj') {
    const extrasEntreno = Math.round(perfil.caloriasActivasReloj ?? 0);
    const extrasDescanso = Math.round(perfil.caloriasDescansoReloj ?? 200);
    caloriasDiaEntreno = tmb + extrasEntreno;
    caloriasDiaDescanso = diasEntrenoSemana === 7 ? caloriasDiaEntreno : tmb + extrasDescanso;
    const extrasPromedio =
      diasEntrenoSemana === 7
        ? extrasEntreno
        : (diasEntrenoSemana * extrasEntreno + (7 - diasEntrenoSemana) * extrasDescanso) / 7;
    tdee = Math.round(tmb + extrasPromedio);
  } else if (
    modoGastoAplicado === 'total_manual' &&
    perfil.caloriasQuemadasDia !== undefined &&
    perfil.caloriasQuemadasDia !== null
  ) {
    tdee = Math.round(perfil.caloriasQuemadasDia);
    caloriasDiaEntreno = tdee;
    caloriasDiaDescanso = tdee;
  }

  const caloriasExtrasDia = Math.max(0, tdee - tmb);
  const usaGastoManual = modoGastoAplicado !== 'actividad';

  let ajusteCalorico: number = AJUSTE_CALORICO_OBJETIVO[perfil.objetivo];
  if (
    perfil.ajusteCaloricoPersonalizado !== undefined &&
    perfil.ajusteCaloricoPersonalizado !== null
  ) {
    const magnitud = Math.round(Math.abs(perfil.ajusteCaloricoPersonalizado));
    if (perfil.objetivo === 'bajar') {
      ajusteCalorico = -magnitud;
    } else if (perfil.objetivo === 'ganar') {
      ajusteCalorico = magnitud;
    }
  }

  const pisoSeguro = PISO_CALORICO_SEGURO[perfil.sexo];
  const caloriasSinPiso = tdee + ajusteCalorico;
  const pisoSeguroAplicado = perfil.objetivo === 'bajar' && caloriasSinPiso < pisoSeguro;

  const caloriasConPiso = pisoSeguroAplicado ? pisoSeguro : caloriasSinPiso;
  const caloriasObjetivo = Math.min(
    LIMITES_PERFIL.caloriasAGS.max,
    Math.max(LIMITES_PERFIL.caloriasAGS.min, Math.round(caloriasConPiso)),
  );
  const deficitEfectivo = Math.max(0, tdee - caloriasObjetivo);
  const alertaDeficitAgresivo = perfil.objetivo === 'bajar' && deficitEfectivo > 750;

  // Proteína de referencia: acota el peso base al límite saludable superior cuando hay sobrepeso/obesidad
  const proteinaPorKg = PROTEINA_POR_KG_OBJETIVO[perfil.objetivo];
  const pesoReferenciaProteina = Math.min(perfil.pesoKg, pesoMaxSaludable);
  const proteinaRecomendadaG = Math.round(pesoReferenciaProteina * proteinaPorKg);

  // Proyección de calorías totales a quemar/acumular y días estimados para lograr el objetivo
  const proyeccion = calcularProyeccionObjetivo({
    pesoActualKg: perfil.pesoKg,
    pesoIdealKg: pesoIdeal,
    pesoMaxSaludableKg: pesoMaxSaludable,
    pesoMetaPersonalizadoKg: perfil.pesoMetaKg ?? null,
    objetivo: perfil.objetivo,
    tdee,
    caloriasObjetivo,
  });

  return {
    imc,
    categoriaIMC,
    etiquetaIMC,
    pesoMinSaludable,
    pesoMaxSaludable,
    pesoIdeal,
    diferenciaKgRango,
    diferenciaKgIdeal,
    tmb,
    caloriasExtrasDia,
    caloriasDiaEntreno,
    caloriasDiaDescanso,
    diasEntrenoSemana,
    tdee,
    tdeeEstimado,
    modoGastoAplicado,
    usaGastoManual,
    ajusteCalorico,
    caloriasObjetivo,
    pisoSeguroAplicado,
    alertaDeficitAgresivo,
    proteinaRecomendadaG,
    proteinaPorKg,
    posicionTermometro: calcularPosicionTermometro(imcCrudo),
    proyeccion,
  };
}

/**
 * Desglosa una cantidad de días en años (365 d), meses (30 d) y días restantes
 * con formatos legibles en español.
 */
export function desglosarDias(diasTotales: number): DesgloseTiempo {
  const dias = Math.max(0, Math.round(diasTotales));
  const anios = Math.floor(dias / 365);
  const restoTrasAnios = dias % 365;
  const meses = Math.floor(restoTrasAnios / 30);
  const diasRestantes = restoTrasAnios % 30;

  if (dias === 0) {
    return {
      diasTotales: 0,
      anios: 0,
      meses: 0,
      diasRestantes: 0,
      textoCorto: '0 días',
      textoCompleto: '0 días',
    };
  }

  const partesLargas: string[] = [];
  const partesCortas: string[] = [];

  if (anios > 0) {
    partesLargas.push(anios === 1 ? '1 año' : `${anios} años`);
    partesCortas.push(`${anios} a`);
  }
  if (meses > 0) {
    partesLargas.push(meses === 1 ? '1 mes' : `${meses} meses`);
    partesCortas.push(`${meses} m`);
  }
  if (diasRestantes > 0) {
    partesLargas.push(diasRestantes === 1 ? '1 día' : `${diasRestantes} días`);
    partesCortas.push(`${diasRestantes} d`);
  }

  let textoCompleto: string;
  if (partesLargas.length === 1) {
    textoCompleto = partesLargas[0];
  } else if (partesLargas.length === 2) {
    textoCompleto = `${partesLargas[0]} y ${partesLargas[1]}`;
  } else {
    textoCompleto = `${partesLargas[0]}, ${partesLargas[1]} y ${partesLargas[2]}`;
  }

  return {
    diasTotales: dias,
    anios,
    meses,
    diasRestantes,
    textoCorto: partesCortas.join(' · '),
    textoCompleto,
  };
}

/**
 * Calcula el peso proyectado, cambio acumulado y calorías acumuladas en un día exacto del plan.
 */
export function calcularAvanceEnDia(
  pesoInicialKg: number,
  pesoMetaKg: number,
  caloriasDiariasCambio: number,
  direccion: 'bajar' | 'subir' | 'mantener',
  diaSolicitado: number,
): AvanceEnDia {
  const dia = Math.max(0, Math.round(diaSolicitado));
  const tiempo = desglosarDias(dia);

  if (direccion === 'mantener' || caloriasDiariasCambio <= 0) {
    return {
      dia,
      tiempo,
      pesoProyectadoKg: redondear(pesoInicialKg, 2),
      cambioAcumuladoKg: 0,
      caloriasAcumuladas: 0,
      porcentajeAvance: 100,
    };
  }

  const kgPorCambiar =
    direccion === 'bajar'
      ? Math.max(0, pesoInicialKg - pesoMetaKg)
      : Math.max(0, pesoMetaKg - pesoInicialKg);
  const caloriasTotales = Math.round(kgPorCambiar * KCAL_POR_KG);
  const caloriasAcumuladas = Math.min(caloriasTotales, Math.round(dia * caloriasDiariasCambio));
  const magnitudCambio = Math.min(kgPorCambiar, caloriasAcumuladas / KCAL_POR_KG);
  const signo = direccion === 'bajar' ? -1 : 1;
  const cambioAcumuladoKg = redondear(signo * magnitudCambio, 2);
  const pesoProyectadoKg = redondear(pesoInicialKg + cambioAcumuladoKg, 2);
  const porcentajeAvance =
    kgPorCambiar > 0 ? redondear(Math.min(100, (magnitudCambio / kgPorCambiar) * 100), 1) : 100;

  return {
    dia,
    tiempo,
    pesoProyectadoKg,
    cambioAcumuladoKg,
    caloriasAcumuladas,
    porcentajeAvance,
  };
}

const PUNTOS_CRONOLOGICOS_BASE: readonly { readonly dia: number; readonly etiqueta: string }[] = [
  { dia: 0, etiqueta: 'Tu inicio (Día 0)' },
  { dia: 1, etiqueta: 'Día 1 (avance diario)' },
  { dia: 7, etiqueta: '1 semana' },
  { dia: 15, etiqueta: '15 días' },
  { dia: 30, etiqueta: '1 mes' },
  { dia: 60, etiqueta: '2 meses' },
  { dia: 90, etiqueta: '3 meses' },
  { dia: 180, etiqueta: '6 meses' },
  { dia: 270, etiqueta: '9 meses' },
  { dia: 365, etiqueta: '1 año' },
  { dia: 545, etiqueta: '1 año y 6 meses' },
  { dia: 730, etiqueta: '2 años' },
  { dia: 1095, etiqueta: '3 años' },
];

export function generarHitosProyeccion(
  pesoInicialKg: number,
  pesoMetaKg: number,
  caloriasDiariasCambio: number,
  direccion: 'bajar' | 'subir' | 'mantener',
  diasEstimados: number,
  diasParaRangoSaludable = 0,
): HitoProyeccion[] {
  if (direccion === 'mantener' || diasEstimados <= 0 || caloriasDiariasCambio <= 0) {
    return [];
  }

  const mapaDias = new Map<
    number,
    { etiqueta: string; esHitoSaludable?: boolean; esMetaFinal?: boolean }
  >();

  for (const punto of PUNTOS_CRONOLOGICOS_BASE) {
    if (punto.dia < diasEstimados) {
      mapaDias.set(punto.dia, { etiqueta: punto.etiqueta });
    }
  }

  if (diasParaRangoSaludable > 0 && diasParaRangoSaludable < diasEstimados) {
    mapaDias.set(diasParaRangoSaludable, {
      etiqueta: 'Entrada a rango saludable',
      esHitoSaludable: true,
    });
  }

  mapaDias.set(diasEstimados, {
    etiqueta: 'Propósito logrado',
    esMetaFinal: true,
  });

  const diasOrdenados = Array.from(mapaDias.keys()).sort((a, b) => a - b);

  return diasOrdenados.map((dia) => {
    const meta = mapaDias.get(dia)!;
    const avance = calcularAvanceEnDia(
      pesoInicialKg,
      pesoMetaKg,
      caloriasDiariasCambio,
      direccion,
      dia,
    );
    return {
      etiqueta: meta.etiqueta,
      dia,
      tiempo: avance.tiempo,
      pesoProyectadoKg: meta.esMetaFinal ? redondear(pesoMetaKg, 1) : avance.pesoProyectadoKg,
      cambioAcumuladoKg: avance.cambioAcumuladoKg,
      caloriasAcumuladas: avance.caloriasAcumuladas,
      porcentajeAvance: meta.esMetaFinal ? 100 : avance.porcentajeAvance,
      esHitoSaludable: meta.esHitoSaludable,
      esMetaFinal: meta.esMetaFinal,
    };
  });
}

interface ParametrosProyeccion {
  readonly pesoActualKg: number;
  readonly pesoIdealKg: number;
  readonly pesoMaxSaludableKg: number;
  readonly pesoMetaPersonalizadoKg: number | null;
  readonly objetivo: ObjetivoFisico;
  readonly tdee: number;
  readonly caloriasObjetivo: number;
}

function construirProyeccionActiva(
  pesoActualKg: number,
  pesoMetaKg: number,
  pesoMaxSaludableKg: number,
  direccion: 'bajar' | 'subir',
  caloriasDiariasCambio: number,
): ProyeccionObjetivo {
  const kgPorCambiar =
    direccion === 'bajar'
      ? redondear(Math.max(0, pesoActualKg - pesoMetaKg), 1)
      : redondear(Math.max(0, pesoMetaKg - pesoActualKg), 1);

  const caloriasTotalesObjetivo = Math.round(kgPorCambiar * KCAL_POR_KG);
  const diasEstimados =
    kgPorCambiar > 0 && caloriasDiariasCambio > 0
      ? Math.ceil(caloriasTotalesObjetivo / caloriasDiariasCambio)
      : 0;
  const semanasEstimadas = redondear(diasEstimados / 7, 1);
  const kgPorDia = redondear(caloriasDiariasCambio / KCAL_POR_KG, 3);
  const gramosPorDia = Math.round((caloriasDiariasCambio / KCAL_POR_KG) * 1000);
  const kgPorSemana = redondear((caloriasDiariasCambio * 7) / KCAL_POR_KG, 2);
  const kgPorMes = redondear((caloriasDiariasCambio * 30) / KCAL_POR_KG, 2);

  let caloriasParaRangoSaludable = 0;
  let diasParaRangoSaludable = 0;
  if (direccion === 'bajar') {
    const kgHastaSaludable = redondear(Math.max(0, pesoActualKg - pesoMaxSaludableKg), 1);
    caloriasParaRangoSaludable = Math.round(kgHastaSaludable * KCAL_POR_KG);
    diasParaRangoSaludable =
      kgHastaSaludable > 0 && caloriasDiariasCambio > 0
        ? Math.ceil(caloriasParaRangoSaludable / caloriasDiariasCambio)
        : 0;
  }

  return {
    pesoMetaKg,
    kgPorCambiar,
    direccion,
    caloriasTotalesObjetivo,
    caloriasDiariasCambio,
    kgPorDia,
    gramosPorDia,
    kgPorSemana,
    kgPorMes,
    diasEstimados,
    semanasEstimadas,
    tiempoDesglosado: desglosarDias(diasEstimados),
    caloriasParaRangoSaludable,
    diasParaRangoSaludable,
    tiempoParaRangoSaludable: desglosarDias(diasParaRangoSaludable),
    hitos: generarHitosProyeccion(
      pesoActualKg,
      pesoMetaKg,
      caloriasDiariasCambio,
      direccion,
      diasEstimados,
      diasParaRangoSaludable,
    ),
  };
}

function calcularProyeccionObjetivo(p: ParametrosProyeccion): ProyeccionObjetivo {
  if (p.objetivo === 'mantener') {
    const ceroTiempo = desglosarDias(0);
    return {
      pesoMetaKg: redondear(p.pesoActualKg, 1),
      kgPorCambiar: 0,
      direccion: 'mantener',
      caloriasTotalesObjetivo: 0,
      caloriasDiariasCambio: 0,
      kgPorDia: 0,
      gramosPorDia: 0,
      kgPorSemana: 0,
      kgPorMes: 0,
      diasEstimados: 0,
      semanasEstimadas: 0,
      tiempoDesglosado: ceroTiempo,
      caloriasParaRangoSaludable: 0,
      diasParaRangoSaludable: 0,
      tiempoParaRangoSaludable: ceroTiempo,
      hitos: [],
    };
  }

  if (p.objetivo === 'bajar') {
    const pesoMetaKg = redondear(p.pesoMetaPersonalizadoKg ?? p.pesoIdealKg, 1);
    const deficitDiario = Math.max(0, p.tdee - p.caloriasObjetivo);
    return construirProyeccionActiva(
      p.pesoActualKg,
      pesoMetaKg,
      p.pesoMaxSaludableKg,
      'bajar',
      deficitDiario,
    );
  }

  const metaPorDefectoGanar =
    p.pesoActualKg < p.pesoIdealKg
      ? p.pesoIdealKg
      : p.pesoActualKg < p.pesoMaxSaludableKg
        ? Math.min(p.pesoMaxSaludableKg, p.pesoActualKg + 3)
        : p.pesoActualKg + 3;
  const pesoMetaKg = redondear(p.pesoMetaPersonalizadoKg ?? metaPorDefectoGanar, 1);
  const superavitDiario = Math.max(0, p.caloriasObjetivo - p.tdee);
  return construirProyeccionActiva(
    p.pesoActualKg,
    pesoMetaKg,
    p.pesoMaxSaludableKg,
    'subir',
    superavitDiario,
  );
}

export interface ProyeccionMenuReal {
  readonly balanceDiarioKcal: number;
  readonly diasEstimadosConMenu: number;
  readonly semanasEstimadasConMenu: number;
  readonly kgPorSemanaConMenu: number;
  readonly proyeccionCompleta: ProyeccionObjetivo;
}

/**
 * Calcula la proyección completa (días, meses, años e hitos) usando exactamente las calorías
 * del menú diario generado por el AGS frente al gasto diario (GET) del usuario.
 */
export function calcularProyeccionConMenu(
  tdee: number,
  caloriasMenuAGS: number,
  proyeccionBase: ProyeccionObjetivo,
  pesoActualKg?: number,
  pesoMaxSaludableKg?: number,
): ProyeccionMenuReal | null {
  if (proyeccionBase.kgPorCambiar <= 0 || proyeccionBase.direccion === 'mantener') {
    return null;
  }

  const balanceDiarioKcal =
    proyeccionBase.direccion === 'bajar'
      ? Math.round(tdee - caloriasMenuAGS)
      : Math.round(caloriasMenuAGS - tdee);

  const pesoInicio =
    pesoActualKg ??
    (proyeccionBase.direccion === 'bajar'
      ? proyeccionBase.pesoMetaKg + proyeccionBase.kgPorCambiar
      : proyeccionBase.pesoMetaKg - proyeccionBase.kgPorCambiar);
  const pesoMax = pesoMaxSaludableKg ?? proyeccionBase.pesoMetaKg;

  if (balanceDiarioKcal <= 0) {
    const proyCero = construirProyeccionActiva(
      pesoInicio,
      proyeccionBase.pesoMetaKg,
      pesoMax,
      proyeccionBase.direccion,
      0,
    );
    return {
      balanceDiarioKcal,
      diasEstimadosConMenu: 0,
      semanasEstimadasConMenu: 0,
      kgPorSemanaConMenu: 0,
      proyeccionCompleta: proyCero,
    };
  }

  const proyeccionCompleta = construirProyeccionActiva(
    pesoInicio,
    proyeccionBase.pesoMetaKg,
    pesoMax,
    proyeccionBase.direccion,
    balanceDiarioKcal,
  );

  return {
    balanceDiarioKcal,
    diasEstimadosConMenu: proyeccionCompleta.diasEstimados,
    semanasEstimadasConMenu: proyeccionCompleta.semanasEstimadas,
    kgPorSemanaConMenu: proyeccionCompleta.kgPorSemana,
    proyeccionCompleta,
  };
}
