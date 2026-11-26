import { describe, expect, it } from 'vitest';
import {
  calcularAvanceEnDia,
  calcularEvaluacionCorporal,
  calcularPosicionTermometro,
  calcularProyeccionConMenu,
  clasificarIMC,
  desglosarDias,
  KCAL_POR_KG,
  PERFIL_POR_DEFECTO,
  validarPerfilUsuario,
} from '../CalculadoraCorporal';
import { PerfilRepositorio } from '../../patterns/singleton';

describe('CalculadoraCorporal (OMS + Mifflin-St Jeor)', () => {
  it('calcula correctamente IMC, rango saludable, TMB, GET y déficit para hombre con sobrepeso', () => {
    const res = calcularEvaluacionCorporal({
      pesoKg: 82,
      estaturaCm: 175,
      edad: 22,
      sexo: 'hombre',
      nivelActividad: 'moderado',
      objetivo: 'bajar',
      presupuestoDiario: 150,
    });

    // IMC = 82 / 1.75^2 = 26.7755 -> 26.8
    expect(res.imc).toBe(26.8);
    expect(res.categoriaIMC).toBe('sobrepeso');
    expect(res.etiquetaIMC).toBe('Sobrepeso');
    expect(res.pesoMinSaludable).toBeCloseTo(56.7, 1);
    expect(res.pesoMaxSaludable).toBeCloseTo(76.3, 1);
    expect(res.pesoIdeal).toBeCloseTo(66.5, 1);
    expect(res.diferenciaKgRango).toBeCloseTo(5.7, 1);

    // TMB = 10*82 + 6.25*175 - 5*22 + 5 = 820 + 1093.75 - 110 + 5 = 1808.75 -> 1809
    expect(res.tmb).toBe(1809);
    // GET = 1809 * 1.55 = 2803.95 -> 2804
    expect(res.tdee).toBe(2804);
    expect(res.ajusteCalorico).toBe(-400);
    expect(res.caloriasObjetivo).toBe(2404);
    expect(res.pisoSeguroAplicado).toBe(false);
    // Proteína de referencia usa min(82, 76.3) * 1.8 = 137.34 -> 137
    expect(res.proteinaRecomendadaG).toBe(137);

    // Proyección de calorías a quemar hacia peso ideal (82 - 66.5 = 15.5 kg)
    expect(res.proyeccion.direccion).toBe('bajar');
    expect(res.proyeccion.pesoMetaKg).toBe(66.5);
    expect(res.proyeccion.kgPorCambiar).toBe(15.5);
    expect(res.proyeccion.caloriasTotalesObjetivo).toBe(Math.round(15.5 * KCAL_POR_KG));
    expect(res.proyeccion.caloriasDiariasCambio).toBe(400);
    expect(res.proyeccion.diasEstimados).toBe(Math.ceil((15.5 * KCAL_POR_KG) / 400));
    // Hito rango saludable: 82 - 76.3 = 5.7 kg -> 43,890 kcal -> 110 días
    expect(res.proyeccion.caloriasParaRangoSaludable).toBe(Math.round(5.7 * KCAL_POR_KG));
    expect(res.proyeccion.diasParaRangoSaludable).toBe(Math.ceil((5.7 * KCAL_POR_KG) / 400));
  });

  it('soporta peso meta personalizado y calcula días reales con el menú del AGS', () => {
    const res = calcularEvaluacionCorporal({
      pesoKg: 82,
      estaturaCm: 175,
      edad: 22,
      sexo: 'hombre',
      nivelActividad: 'moderado',
      objetivo: 'bajar',
      presupuestoDiario: 150,
      pesoMetaKg: 77,
    });

    // Bajar 5 kg -> 38,500 kcal / 400 kcal/día = 96.25 -> 97 días
    expect(res.proyeccion.kgPorCambiar).toBe(5);
    expect(res.proyeccion.caloriasTotalesObjetivo).toBe(38500);
    expect(res.proyeccion.diasEstimados).toBe(97);

    // Con un menú AGS de 2,204 kcal (déficit real = 2804 - 2204 = 600 kcal/día) -> 65 días
    const conMenu = calcularProyeccionConMenu(res.tdee, 2204, res.proyeccion);
    expect(conMenu).not.toBeNull();
    expect(conMenu?.balanceDiarioKcal).toBe(600);
    expect(conMenu?.diasEstimadosConMenu).toBe(Math.ceil(38500 / 600));
  });

  it('usa caloriasQuemadasDia (medido por reloj/ejercicio) en lugar del GET estimado', () => {
    const res = calcularEvaluacionCorporal({
      pesoKg: 82,
      estaturaCm: 175,
      edad: 22,
      sexo: 'hombre',
      nivelActividad: 'moderado',
      objetivo: 'bajar',
      presupuestoDiario: 150,
      pesoMetaKg: 77,
      caloriasQuemadasDia: 3200,
    });

    expect(res.usaGastoManual).toBe(true);
    expect(res.tdeeEstimado).toBe(2804);
    expect(res.tdee).toBe(3200);
    expect(res.caloriasObjetivo).toBe(2800);
    expect(res.proyeccion.caloriasDiariasCambio).toBe(400);

    // Si el menú AGS consume 2,200 kcal frente a 3,200 kcal quemadas -> 1,000 kcal/día de déficit -> 39 días
    const conMenu = calcularProyeccionConMenu(res.tdee, 2200, res.proyeccion);
    expect(conMenu?.balanceDiarioKcal).toBe(1000);
    expect(conMenu?.diasEstimadosConMenu).toBe(39);
  });

  it('suma automáticamente TMB + calorías activas del reloj cuando modoGasto es reloj', () => {
    const res = calcularEvaluacionCorporal({
      pesoKg: 82,
      estaturaCm: 175,
      edad: 22,
      sexo: 'hombre',
      nivelActividad: 'moderado',
      objetivo: 'bajar',
      presupuestoDiario: 150,
      pesoMetaKg: 77,
      modoGasto: 'reloj',
      caloriasActivasReloj: 650,
    });

    // TMB = 1809, Reloj = 650 -> GET = 2459 -> meta déficit = 2059
    expect(res.modoGastoAplicado).toBe('reloj');
    expect(res.usaGastoManual).toBe(true);
    expect(res.tmb).toBe(1809);
    expect(res.tdee).toBe(2459);
    expect(res.caloriasObjetivo).toBe(2059);
    expect(res.proyeccion.diasEstimados).toBe(97);
  });

  it('desglosa correctamente días en años, meses y días restantes y genera hitos progresivos', () => {
    expect(desglosarDias(0).textoCompleto).toBe('0 días');
    expect(desglosarDias(1).textoCompleto).toBe('1 día');
    expect(desglosarDias(45)).toMatchObject({
      anios: 0,
      meses: 1,
      diasRestantes: 15,
      textoCompleto: '1 mes y 15 días',
    });
    expect(desglosarDias(415)).toMatchObject({
      anios: 1,
      meses: 1,
      diasRestantes: 20,
      textoCompleto: '1 año, 1 mes y 20 días',
    });

    const avanceDia30 = calcularAvanceEnDia(82, 66.5, 400, 'bajar', 30);
    expect(avanceDia30.caloriasAcumuladas).toBe(12000);
    expect(avanceDia30.cambioAcumuladoKg).toBeCloseTo(-1.56, 2);
    expect(avanceDia30.pesoProyectadoKg).toBeCloseTo(80.44, 2);

    const res = calcularEvaluacionCorporal({
      pesoKg: 82,
      estaturaCm: 175,
      edad: 22,
      sexo: 'hombre',
      nivelActividad: 'moderado',
      objetivo: 'bajar',
      presupuestoDiario: 150,
    });
    expect(res.proyeccion.gramosPorDia).toBe(52);
    expect(res.proyeccion.kgPorMes).toBeCloseTo(1.56, 2);
    expect(res.proyeccion.hitos.length).toBeGreaterThan(5);
    expect(res.proyeccion.hitos[0].dia).toBe(0);
    expect(res.proyeccion.hitos[res.proyeccion.hitos.length - 1].esMetaFinal).toBe(true);
    expect(res.proyeccion.hitos.some((h) => h.esHitoSaludable)).toBe(true);
  });

  it('reduce los días estimados al aumentar el déficit diario personalizado y activa alerta si > 750 kcal', () => {
    const moderado = calcularEvaluacionCorporal({
      pesoKg: 82,
      estaturaCm: 175,
      edad: 22,
      sexo: 'hombre',
      nivelActividad: 'moderado',
      objetivo: 'bajar',
      presupuestoDiario: 150,
      pesoMetaKg: 72,
      ajusteCaloricoPersonalizado: 400,
    });

    const rapido = calcularEvaluacionCorporal({
      pesoKg: 82,
      estaturaCm: 175,
      edad: 22,
      sexo: 'hombre',
      nivelActividad: 'moderado',
      objetivo: 'bajar',
      presupuestoDiario: 150,
      pesoMetaKg: 72,
      ajusteCaloricoPersonalizado: 800,
    });

    expect(moderado.alertaDeficitAgresivo).toBe(false);
    expect(rapido.alertaDeficitAgresivo).toBe(true);
    expect(rapido.caloriasObjetivo).toBe(moderado.tdee - 800);
    expect(rapido.proyeccion.diasEstimados).toBeLessThan(moderado.proyeccion.diasEstimados);
    expect(rapido.proyeccion.diasEstimados).toBe(Math.ceil((10 * KCAL_POR_KG) / 800));
  });

  it('promedia correctamente los días de entrenamiento (Lun–Vie) y días de descanso (Sáb–Dom)', () => {
    const res = calcularEvaluacionCorporal({
      pesoKg: 82,
      estaturaCm: 175,
      edad: 22,
      sexo: 'hombre',
      nivelActividad: 'moderado',
      objetivo: 'bajar',
      presupuestoDiario: 150,
      modoGasto: 'reloj',
      diasEntrenoSemana: 5,
      caloriasActivasReloj: 1000,
      caloriasDescansoReloj: 200,
    });

    // TMB = 1809; extras promedio = (5*1000 + 2*200) / 7 = 5400 / 7 = 771.43 -> tdee = 2580
    expect(res.tmb).toBe(1809);
    expect(res.caloriasDiaEntreno).toBe(2809);
    expect(res.caloriasDiaDescanso).toBe(2009);
    expect(res.tdee).toBe(2580);
    expect(res.caloriasExtrasDia).toBe(771);
    expect(res.caloriasObjetivo).toBe(2180);
  });

  it('aplica piso calórico seguro en déficit agresivo para mujer de baja estatura y sedentaria', () => {
    const res = calcularEvaluacionCorporal({
      pesoKg: 48,
      estaturaCm: 152,
      edad: 35,
      sexo: 'mujer',
      nivelActividad: 'sedentario',
      objetivo: 'bajar',
      presupuestoDiario: 120,
    });

    // TMB = 480 + 950 - 175 - 161 = 1094; GET = 1094 * 1.2 = 1313; 1313 - 400 = 913 < 1200
    expect(res.tmb).toBe(1094);
    expect(res.tdee).toBe(1313);
    expect(res.pisoSeguroAplicado).toBe(true);
    expect(res.caloriasObjetivo).toBe(1200);
  });

  it('calcula correctamente superávit (+300 kcal) para objetivo ganar masa muscular', () => {
    const res = calcularEvaluacionCorporal({
      pesoKg: 60,
      estaturaCm: 175,
      edad: 20,
      sexo: 'hombre',
      nivelActividad: 'activo',
      objetivo: 'ganar',
      presupuestoDiario: 200,
    });

    expect(res.categoriaIMC).toBe('saludable');
    expect(res.diferenciaKgRango).toBe(0);
    expect(res.ajusteCalorico).toBe(300);
    expect(res.caloriasObjetivo).toBe(res.tdee + 300);
    expect(res.proteinaPorKg).toBe(2.0);
    expect(res.proteinaRecomendadaG).toBe(120);
  });

  it('clasifica correctamente todas las fronteras OMS de IMC', () => {
    expect(clasificarIMC(18.4).categoria).toBe('bajo_peso');
    expect(clasificarIMC(18.5).categoria).toBe('saludable');
    expect(clasificarIMC(24.9).categoria).toBe('saludable');
    expect(clasificarIMC(25.0).categoria).toBe('sobrepeso');
    expect(clasificarIMC(29.9).categoria).toBe('sobrepeso');
    expect(clasificarIMC(30.0).categoria).toBe('obesidad_1');
    expect(clasificarIMC(35.0).categoria).toBe('obesidad_2_3');
  });

  it('acota la posición del termómetro en el rango [0, 100]', () => {
    expect(calcularPosicionTermometro(10)).toBe(0);
    expect(calcularPosicionTermometro(14)).toBe(0);
    expect(calcularPosicionTermometro(27)).toBe(50);
    expect(calcularPosicionTermometro(40)).toBe(100);
    expect(calcularPosicionTermometro(55)).toBe(100);
  });

  it('rechaza valores fuera de rango en validarPerfilUsuario', () => {
    expect(() => validarPerfilUsuario({ ...PERFIL_POR_DEFECTO, pesoKg: 10 })).toThrow(RangeError);
    expect(() => validarPerfilUsuario({ ...PERFIL_POR_DEFECTO, estaturaCm: 80 })).toThrow(
      RangeError,
    );
    expect(() => validarPerfilUsuario({ ...PERFIL_POR_DEFECTO, edad: 10 })).toThrow(RangeError);
    expect(() => validarPerfilUsuario({ ...PERFIL_POR_DEFECTO, presupuestoDiario: 5 })).toThrow(
      RangeError,
    );
  });

  it('persiste y restaura correctamente en PerfilRepositorio', () => {
    const memoria = new Map<string, string>();
    const almacen = {
      getItem: (k: string) => memoria.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memoria.set(k, v);
      },
      removeItem: (k: string) => {
        memoria.delete(k);
      },
    };

    PerfilRepositorio.reiniciarInstancia();
    const repo = PerfilRepositorio.obtenerInstancia(almacen);
    repo.actualizar({ pesoKg: 68, objetivo: 'ganar', presupuestoDiario: 180 });

    PerfilRepositorio.reiniciarInstancia();
    const repoRecargado = PerfilRepositorio.obtenerInstancia(almacen);
    expect(repoRecargado.obtenerSnapshot().pesoKg).toBe(68);
    expect(repoRecargado.obtenerSnapshot().objetivo).toBe('ganar');
    expect(repoRecargado.obtenerSnapshot().presupuestoDiario).toBe(180);

    repoRecargado.restaurarPorDefecto();
    expect(repoRecargado.obtenerSnapshot()).toEqual(PERFIL_POR_DEFECTO);
    PerfilRepositorio.reiniciarInstancia();
  });
});
