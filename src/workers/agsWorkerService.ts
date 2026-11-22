import { EvaluadorAleatorio } from '../models/EvaluadorAleatorio';
import { MotorAGS } from '../models/MotorAGS';
import type {
  ConfiguracionEjecucion,
  DatosAlimento,
  DatosIndividuo,
  ReporteGeneracion,
  ResultadoAleatorio,
} from '../models/types';
import { derivarSemilla } from '../models/utils/rng';
import { AlimentoFactory } from '../patterns/factory';
import { PenalizacionEstatica } from '../patterns/strategy';
import type {
  APIWorkerAGS,
  CeldaExperimento,
  ConfiguracionBarridoExperimentos,
  EstadisticasMetodo,
  ProgresoComparativa,
  ProgresoExperimentos,
  PuntoCurvaComparativa,
  ResultadoBarridoExperimentos,
  ResultadoComparativaMultiCorrida,
  ResultadoCorridaCompleta,
} from './types';

function cederTurno(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function media(valores: readonly number[]): number {
  if (valores.length === 0) return 0;
  return valores.reduce((acc, v) => acc + v, 0) / valores.length;
}

function desviacionEstandar(valores: readonly number[]): number {
  if (valores.length <= 1) return 0;
  const promedio = media(valores);
  const varianza = valores.reduce((acc, v) => acc + (v - promedio) ** 2, 0) / valores.length;
  return Math.sqrt(varianza);
}

/**
 * Crea el servicio del Worker desacoplado de Comlink para facilitar pruebas
 * unitarias directas en Node/Vitest y ejecución en Web Worker real.
 */
export function crearServicioAGSWorker(): APIWorkerAGS {
  let pausado = false;
  let detenerSolicitado = false;
  let resolverPausa: (() => void) | null = null;
  let cancelarComparativaSolicitado = false;
  let cancelarExperimentosSolicitado = false;

  const esperarSiPausado = async (): Promise<void> => {
    while (pausado && !detenerSolicitado) {
      await new Promise<void>((resolve) => {
        resolverPausa = resolve;
      });
    }
  };

  return {
    async ejecutarAGS(
      catalogoDatos: readonly DatosAlimento[],
      configuracion: ConfiguracionEjecucion,
      onProgreso: (reporte: ReporteGeneracion) => void,
    ): Promise<ResultadoCorridaCompleta> {
      pausado = false;
      detenerSolicitado = false;
      resolverPausa = null;

      const catalogo = AlimentoFactory.crearCatalogoDesdeJSON(catalogoDatos);
      const motor = new MotorAGS(catalogo, configuracion);
      motor.progreso.suscribir(onProgreso);

      let ultimoCeder = performance.now();

      while (!motor.estaFinalizado) {
        if (detenerSolicitado) break;
        await esperarSiPausado();
        if (detenerSolicitado) break;

        motor.ejecutarSiguienteGeneracion();

        // Ceder el bucle de eventos cada ~12 ms para atender pausar/detener sin bloquear
        const ahora = performance.now();
        if (ahora - ultimoCeder >= 12) {
          ultimoCeder = ahora;
          await cederTurno();
        }
      }

      const resultadoAGS = motor.obtenerResultado(detenerSolicitado ? 'cancelado' : undefined);

      // Ejecutar línea base aleatoria con el mismo presupuesto de evaluaciones exacto
      const bloques = Math.max(1, resultadoAGS.generacionesEjecutadas);
      const evaluadorAleatorio = new EvaluadorAleatorio(catalogo, configuracion.restricciones);
      const resultadoAleatorio: ResultadoAleatorio =
        resultadoAGS.generacionesEjecutadas > 0
          ? evaluadorAleatorio.ejecutar({
              tamanoBloque: configuracion.parametros.tamanoPoblacion,
              cantidadBloques: bloques,
              probabilidadInicial: configuracion.parametros.probabilidadInicial,
              semilla: configuracion.parametros.semilla,
              penalizacion: new PenalizacionEstatica(configuracion.parametros.factorPenalizacion),
            })
          : {
              mejorIndividuo: null,
              historial: [],
              bloqueMejorHallazgo: 0,
              evaluacionMejorHallazgo: 0,
              evaluacionesTotales: 0,
              tiempoMs: 0,
              semilla: configuracion.parametros.semilla,
            };

      return {
        ags: resultadoAGS,
        aleatorio: resultadoAleatorio,
      };
    },

    pausarAGS(): void {
      pausado = true;
    },

    reanudarAGS(): void {
      pausado = false;
      if (resolverPausa) {
        const resolver = resolverPausa;
        resolverPausa = null;
        resolver();
      }
    },

    detenerAGS(): void {
      detenerSolicitado = true;
      pausado = false;
      if (resolverPausa) {
        const resolver = resolverPausa;
        resolverPausa = null;
        resolver();
      }
    },

    async ejecutarComparativaMultiCorrida(
      catalogoDatos: readonly DatosAlimento[],
      configuracion: ConfiguracionEjecucion,
      cantidadCorridas: number,
      onProgreso: (progreso: ProgresoComparativa) => void,
    ): Promise<ResultadoComparativaMultiCorrida> {
      cancelarComparativaSolicitado = false;
      const total = Math.max(1, Math.trunc(cantidadCorridas));
      const catalogo = AlimentoFactory.crearCatalogoDesdeJSON(catalogoDatos);
      const semillaBase = configuracion.parametros.semilla;

      const corridasDetalle: ResultadoComparativaMultiCorrida['corridasDetalle'][number][] = [];
      let mejorIndividuoAGS: DatosIndividuo | null = null;
      let mejorIndividuoAleatorio: DatosIndividuo | null = null;

      const historialesAGS: readonly ReporteGeneracion[][] = [];
      const historialesAleatorios: readonly { bloque: number; mejorFactibleAcumulado: number }[][] =
        [];

      for (let i = 0; i < total; i++) {
        if (cancelarComparativaSolicitado) break;

        const semilla = derivarSemilla(semillaBase, i);
        const configCorrida: ConfiguracionEjecucion = {
          restricciones: configuracion.restricciones,
          parametros: { ...configuracion.parametros, semilla },
        };

        const resAGS = new MotorAGS(catalogo, configCorrida).ejecutar({
          debeCancelar: () => cancelarComparativaSolicitado,
        });
        if (cancelarComparativaSolicitado) break;

        const evalAleatorio = new EvaluadorAleatorio(catalogo, configuracion.restricciones);
        const resAleatorio = evalAleatorio.ejecutar({
          tamanoBloque: configuracion.parametros.tamanoPoblacion,
          cantidadBloques: Math.max(1, resAGS.generacionesEjecutadas),
          probabilidadInicial: configuracion.parametros.probabilidadInicial,
          semilla,
          penalizacion: new PenalizacionEstatica(configuracion.parametros.factorPenalizacion),
          debeCancelar: () => cancelarComparativaSolicitado,
        });
        if (cancelarComparativaSolicitado) break;

        if (
          resAGS.mejorIndividuo &&
          (mejorIndividuoAGS === null ||
            resAGS.mejorIndividuo.proteinaTotal > mejorIndividuoAGS.proteinaTotal)
        ) {
          mejorIndividuoAGS = resAGS.mejorIndividuo;
        }

        if (
          resAleatorio.mejorIndividuo &&
          (mejorIndividuoAleatorio === null ||
            resAleatorio.mejorIndividuo.proteinaTotal > mejorIndividuoAleatorio.proteinaTotal)
        ) {
          mejorIndividuoAleatorio = resAleatorio.mejorIndividuo;
        }

        (historialesAGS as ReporteGeneracion[][]).push([...resAGS.historial]);
        (historialesAleatorios as { bloque: number; mejorFactibleAcumulado: number }[][]).push([
          ...resAleatorio.historial,
        ]);

        corridasDetalle.push({
          corrida: i + 1,
          semilla,
          proteinaAGS: resAGS.mejorIndividuo?.proteinaTotal ?? 0,
          caloriasAGS: resAGS.mejorIndividuo?.caloriasTotales ?? 0,
          costoAGS: resAGS.mejorIndividuo?.costoTotal ?? 0,
          factibleAGS: resAGS.mejorIndividuo?.factible ?? false,
          generacionAGS: resAGS.generacionConvergencia,
          tiempoAGSMs: resAGS.tiempoMs,
          proteinaAleatorio: resAleatorio.mejorIndividuo?.proteinaTotal ?? 0,
          caloriasAleatorio: resAleatorio.mejorIndividuo?.caloriasTotales ?? 0,
          costoAleatorio: resAleatorio.mejorIndividuo?.costoTotal ?? 0,
          factibleAleatorio: resAleatorio.mejorIndividuo?.factible ?? false,
          bloqueAleatorio: resAleatorio.bloqueMejorHallazgo,
          tiempoAleatorioMs: resAleatorio.tiempoMs,
          evaluaciones: resAGS.evaluacionesTotales,
        });

        onProgreso({ completadas: i + 1, total });
        await cederTurno();
      }

      const maxPasos = historialesAGS.reduce((max, h) => Math.max(max, h.length), 0);
      const curvaPromedio: PuntoCurvaComparativa[] = [];
      for (let pasoIdx = 0; pasoIdx < maxPasos; pasoIdx++) {
        const valoresAGS = historialesAGS.map((h) => {
          const item = h[Math.min(pasoIdx, h.length - 1)];
          return item ? item.mejorFactibleGlobal : 0;
        });
        const valoresAleat = historialesAleatorios.map((h) => {
          const item = h[Math.min(pasoIdx, h.length - 1)];
          return item ? item.mejorFactibleAcumulado : 0;
        });
        curvaPromedio.push({
          paso: pasoIdx + 1,
          proteinaMediaAGS: Number(media(valoresAGS).toFixed(2)),
          proteinaMediaAleatorio: Number(media(valoresAleat).toFixed(2)),
        });
      }

      const proteinaAGSLista = corridasDetalle.map((c) => c.proteinaAGS);
      const proteinaAleatLista = corridasDetalle.map((c) => c.proteinaAleatorio);
      const evaluacionesMedia = Math.round(media(corridasDetalle.map((c) => c.evaluaciones)));

      const estadisticasAGS: EstadisticasMetodo = {
        proteinaMedia: Number(media(proteinaAGSLista).toFixed(2)),
        proteinaDesviacion: Number(desviacionEstandar(proteinaAGSLista).toFixed(2)),
        mejorProteina: proteinaAGSLista.length > 0 ? Math.max(...proteinaAGSLista) : 0,
        caloriasMedias: Number(media(corridasDetalle.map((c) => c.caloriasAGS)).toFixed(1)),
        costoMedio: Number(media(corridasDetalle.map((c) => c.costoAGS)).toFixed(2)),
        porcentajeFactibles:
          corridasDetalle.length > 0
            ? Number(
                (
                  (corridasDetalle.filter((c) => c.factibleAGS).length / corridasDetalle.length) *
                  100
                ).toFixed(1),
              )
            : 0,
        generacionOBloqueMedio: Number(
          media(corridasDetalle.map((c) => c.generacionAGS)).toFixed(1),
        ),
        tiempoMedioMs: Number(media(corridasDetalle.map((c) => c.tiempoAGSMs)).toFixed(2)),
        evaluacionesPorCorrida: evaluacionesMedia,
      };

      const estadisticasAleatorio: EstadisticasMetodo = {
        proteinaMedia: Number(media(proteinaAleatLista).toFixed(2)),
        proteinaDesviacion: Number(desviacionEstandar(proteinaAleatLista).toFixed(2)),
        mejorProteina: proteinaAleatLista.length > 0 ? Math.max(...proteinaAleatLista) : 0,
        caloriasMedias: Number(media(corridasDetalle.map((c) => c.caloriasAleatorio)).toFixed(1)),
        costoMedio: Number(media(corridasDetalle.map((c) => c.costoAleatorio)).toFixed(2)),
        porcentajeFactibles:
          corridasDetalle.length > 0
            ? Number(
                (
                  (corridasDetalle.filter((c) => c.factibleAleatorio).length /
                    corridasDetalle.length) *
                  100
                ).toFixed(1),
              )
            : 0,
        generacionOBloqueMedio: Number(
          media(corridasDetalle.map((c) => c.bloqueAleatorio)).toFixed(1),
        ),
        tiempoMedioMs: Number(media(corridasDetalle.map((c) => c.tiempoAleatorioMs)).toFixed(2)),
        evaluacionesPorCorrida: evaluacionesMedia,
      };

      return {
        cantidadCorridas: corridasDetalle.length,
        semillaBase,
        estadisticasAGS,
        estadisticasAleatorio,
        mejorIndividuoAGS,
        mejorIndividuoAleatorio,
        curvaPromedio,
        corridasDetalle,
      };
    },

    cancelarComparativa(): void {
      cancelarComparativaSolicitado = true;
    },

    async ejecutarBarridoExperimentos(
      catalogoDatos: readonly DatosAlimento[],
      configuracion: ConfiguracionEjecucion,
      barrido: ConfiguracionBarridoExperimentos,
      onProgreso: (progreso: ProgresoExperimentos) => void,
    ): Promise<ResultadoBarridoExperimentos> {
      cancelarExperimentosSolicitado = false;
      const inicioTotal = performance.now();
      const catalogo = AlimentoFactory.crearCatalogoDesdeJSON(catalogoDatos);
      const semillaBase = configuracion.parametros.semilla;

      const corridasPorComb = Math.max(1, Math.trunc(barrido.corridasPorCombinacion));
      const total = barrido.valoresPc.length * barrido.valoresPm.length * corridasPorComb;
      let completadas = 0;

      const celdas: CeldaExperimento[] = [];

      for (const pc of barrido.valoresPc) {
        for (const pm of barrido.valoresPm) {
          if (cancelarExperimentosSolicitado) break;

          const proteinas: number[] = [];
          const convergencias: number[] = [];
          const tiempos: number[] = [];
          let factibles = 0;
          const historialesCelda: ReporteGeneracion[][] = [];

          for (let r = 0; r < corridasPorComb; r++) {
            if (cancelarExperimentosSolicitado) break;

            const semilla = derivarSemilla(semillaBase, r);
            const configCorrida: ConfiguracionEjecucion = {
              restricciones: configuracion.restricciones,
              parametros: {
                ...configuracion.parametros,
                probabilidadCruce: pc,
                probabilidadMutacion: pm,
                semilla,
              },
            };

            const res = new MotorAGS(catalogo, configCorrida).ejecutar({
              debeCancelar: () => cancelarExperimentosSolicitado,
            });
            if (cancelarExperimentosSolicitado) break;

            proteinas.push(res.mejorIndividuo?.proteinaTotal ?? 0);
            convergencias.push(res.generacionConvergencia);
            tiempos.push(res.tiempoMs);
            if (res.mejorIndividuo?.factible) factibles += 1;
            historialesCelda.push([...res.historial]);

            completadas += 1;
            onProgreso({ completadas, total, pcActual: pc, pmActual: pm });
            await cederTurno();
          }

          if (proteinas.length > 0) {
            const maxGen = historialesCelda.reduce((m, h) => Math.max(m, h.length), 0);
            const curvaPromedio: { generacion: number; proteinaMedia: number }[] = [];

            for (let g = 0; g < maxGen; g++) {
              const valoresGen = historialesCelda.map((h) => {
                const punto = h[Math.min(g, h.length - 1)];
                return punto ? punto.mejorFactibleGlobal : 0;
              });
              curvaPromedio.push({
                generacion: g + 1,
                proteinaMedia: Number(media(valoresGen).toFixed(2)),
              });
            }

            celdas.push({
              pc,
              pm,
              proteinaMedia: Number(media(proteinas).toFixed(2)),
              proteinaDesviacion: Number(desviacionEstandar(proteinas).toFixed(2)),
              mejorProteina: Math.max(...proteinas),
              porcentajeFactibles: Number(((factibles / proteinas.length) * 100).toFixed(1)),
              generacionConvergenciaMedia: Number(media(convergencias).toFixed(1)),
              tiempoMedioMs: Number(media(tiempos).toFixed(2)),
              curvaPromedio,
            });
          }
        }
      }

      return {
        configuracion: barrido,
        semillaBase,
        celdas,
        totalCorridasEjecutadas: completadas,
        cancelado: cancelarExperimentosSolicitado,
        tiempoTotalMs: Number((performance.now() - inicioTotal).toFixed(2)),
      };
    },

    cancelarExperimentos(): void {
      cancelarExperimentosSolicitado = true;
    },
  };
}
