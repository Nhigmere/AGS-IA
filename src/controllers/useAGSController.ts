import { proxy } from 'comlink';
import { useCallback, useEffect, useRef } from 'react';
import type {
  DatosAlimento,
  ParametrosAGS,
  PerfilUsuario,
  ReporteGeneracion,
  RestriccionesDieta,
} from '../models/types';
import { CatalogoRepositorio, ConfiguracionGlobal, PerfilRepositorio } from '../patterns/singleton';
import { DIETA_HUMANA_INICIAL, useAGSStore, type VistaActiva } from '../store/useAGSStore';
import type {
  ConfiguracionBarridoExperimentos,
  ProgresoComparativa,
  ProgresoExperimentos,
} from '../workers/types';
import { evaluarSeleccionHumana } from './comparativa';
import { calcularEvaluacionCorporal } from './perfil';
import { obtenerWorkerAGS } from './workerClient';

/** Intervalo mínimo entre volcados a Zustand (~30 renders/s máx. para proteger Recharts). */
const INTERVALO_VOLCADO_MS = 34;

/**
 * Controller principal de la arquitectura MVC.
 * Única capa que coordina los repositorios Singleton, el Web Worker (vía Comlink)
 * y el store Zustand que las vistas leen.
 */
export function useAGSController() {
  const bufferReportesRef = useRef<ReporteGeneracion[]>([]);
  const timerVolcadoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const corridaActivaIdRef = useRef(0);

  const limpiarBuffer = useCallback(() => {
    if (timerVolcadoRef.current !== null) {
      clearTimeout(timerVolcadoRef.current);
      timerVolcadoRef.current = null;
    }
    bufferReportesRef.current = [];
  }, []);

  const volcarBuffer = useCallback(() => {
    if (timerVolcadoRef.current !== null) {
      clearTimeout(timerVolcadoRef.current);
      timerVolcadoRef.current = null;
    }
    if (bufferReportesRef.current.length > 0) {
      const lote = bufferReportesRef.current;
      bufferReportesRef.current = [];
      useAGSStore.getState().agregarReportesHistorial(lote);
    }
  }, []);

  const encolarReporte = useCallback(
    (corridaId: number, reporte: ReporteGeneracion) => {
      if (corridaId !== corridaActivaIdRef.current) return;
      bufferReportesRef.current.push(reporte);
      if (timerVolcadoRef.current === null) {
        timerVolcadoRef.current = setTimeout(() => {
          if (corridaId === corridaActivaIdRef.current) {
            volcarBuffer();
          } else {
            limpiarBuffer();
          }
        }, INTERVALO_VOLCADO_MS);
      }
    },
    [limpiarBuffer, volcarBuffer],
  );

  useEffect(() => {
    return () => {
      if (timerVolcadoRef.current !== null) {
        clearTimeout(timerVolcadoRef.current);
      }
    };
  }, []);

  const ejecutar = useCallback(async () => {
    const store = useAGSStore.getState();
    if (store.estadoEjecucion === 'ejecutando' || store.estadoEjecucion === 'cargando') {
      return;
    }

    const corridaId = corridaActivaIdRef.current + 1;
    corridaActivaIdRef.current = corridaId;
    limpiarBuffer();
    store.reiniciarResultadosEjecucion();
    store.setCatalogoModificadoSinEjecutar(false);
    store.setEstadoEjecucion('cargando');

    try {
      const catalogoSnapshot = CatalogoRepositorio.obtenerInstancia().obtenerSnapshot();
      const configuracionSnapshot = ConfiguracionGlobal.obtenerInstancia().obtenerSnapshot();
      const worker = obtenerWorkerAGS();

      store.setEstadoEjecucion('ejecutando');
      const { ags, aleatorio } = await worker.ejecutarAGS(
        catalogoSnapshot,
        configuracionSnapshot,
        proxy((reporte: ReporteGeneracion) => {
          encolarReporte(corridaId, reporte);
        }),
      );

      // Invalida callbacks tardíos de Comlink antes de escribir el resultado definitivo
      if (corridaActivaIdRef.current === corridaId) {
        corridaActivaIdRef.current = corridaId + 1;
        limpiarBuffer();
        useAGSStore.getState().establecerResultadoEjecucion(ags, aleatorio);
      }
    } catch (error) {
      limpiarBuffer();
      const mensaje =
        error instanceof Error ? error.message : 'Error inesperado al ejecutar el AGS.';
      useAGSStore.getState().setErrorEjecucion(mensaje);
      useAGSStore.getState().setEstadoEjecucion('inactivo');
    }
  }, [encolarReporte, limpiarBuffer]);

  const pausar = useCallback(async () => {
    const store = useAGSStore.getState();
    if (store.estadoEjecucion !== 'ejecutando') return;
    await obtenerWorkerAGS().pausarAGS();
    store.setEstadoEjecucion('pausado');
  }, []);

  const reanudar = useCallback(async () => {
    const store = useAGSStore.getState();
    if (store.estadoEjecucion !== 'pausado') return;
    store.setEstadoEjecucion('ejecutando');
    await obtenerWorkerAGS().reanudarAGS();
  }, []);

  const detener = useCallback(async () => {
    const store = useAGSStore.getState();
    if (
      store.estadoEjecucion !== 'ejecutando' &&
      store.estadoEjecucion !== 'pausado' &&
      store.estadoEjecucion !== 'cargando'
    ) {
      return;
    }
    await obtenerWorkerAGS().detenerAGS();
    volcarBuffer();
    store.setEstadoEjecucion('detenido');
  }, [volcarBuffer]);

  const reiniciar = useCallback(async () => {
    corridaActivaIdRef.current += 1;
    const store = useAGSStore.getState();
    if (
      store.estadoEjecucion === 'ejecutando' ||
      store.estadoEjecucion === 'pausado' ||
      store.estadoEjecucion === 'cargando'
    ) {
      await obtenerWorkerAGS().detenerAGS();
    }
    limpiarBuffer();
    store.reiniciarResultadosEjecucion();
  }, [limpiarBuffer]);

  const actualizarRestricciones = useCallback((parcial: Partial<RestriccionesDieta>) => {
    const snapshot = ConfiguracionGlobal.obtenerInstancia().actualizarRestricciones(parcial);
    const store = useAGSStore.getState();
    store.setConfiguracion(snapshot);

    // Recalcular dieta humana si el usuario ya tenía alimentos marcados
    const { dietaHumana, catalogo } = store;
    if (dietaHumana.idsSeleccionados.length > 0) {
      store.setDietaHumana({
        ...dietaHumana,
        evaluacion: evaluarSeleccionHumana(
          catalogo,
          dietaHumana.idsSeleccionados,
          snapshot.restricciones,
        ),
      });
    }
  }, []);

  const actualizarParametros = useCallback((parcial: Partial<ParametrosAGS>) => {
    const snapshot = ConfiguracionGlobal.obtenerInstancia().actualizarParametros(parcial);
    useAGSStore.getState().setConfiguracion(snapshot);
  }, []);

  const restaurarConfiguracionPorDefecto = useCallback(() => {
    const nAlimentos = CatalogoRepositorio.obtenerInstancia().longitud;
    const snapshot = ConfiguracionGlobal.obtenerInstancia().restaurarPorDefecto(nAlimentos);
    useAGSStore.getState().setConfiguracion(snapshot);
  }, []);

  const generarNuevaSemilla = useCallback(() => {
    const semillaNueva = Math.floor(Date.now() % 1_000_000);
    const snapshot = ConfiguracionGlobal.obtenerInstancia().actualizarParametros({
      semilla: semillaNueva,
    });
    useAGSStore.getState().setConfiguracion(snapshot);
  }, []);

  /**
   * Al modificar N en el catálogo, se reinicializan los resultados y la selección humana
   * para garantizar que nunca se reutilice una población con N distinto.
   */
  const sincronizarCambioCatalogo = useCallback(async () => {
    const repo = CatalogoRepositorio.obtenerInstancia();
    const catalogoSnapshot = repo.obtenerSnapshot();
    const store = useAGSStore.getState();
    store.setCatalogo(catalogoSnapshot);
    store.setResultadoComparativa(null);
    store.setResultadoExperimentos(null);
    store.setDietaHumana(DIETA_HUMANA_INICIAL);
    store.setCatalogoModificadoSinEjecutar(true);

    const pmRecomendada = ConfiguracionGlobal.calcularPmRecomendada(catalogoSnapshot.length);
    const configActualizada = ConfiguracionGlobal.obtenerInstancia().actualizarParametros({
      probabilidadMutacion: pmRecomendada,
    });
    store.setConfiguracion(configActualizada);

    await reiniciar();
  }, [reiniciar]);

  const agregarAlimento = useCallback(
    async (datos: Omit<DatosAlimento, 'id'>) => {
      const id = `ali-${Date.now().toString(36)}`;
      CatalogoRepositorio.obtenerInstancia().agregar({ ...datos, id });
      await sincronizarCambioCatalogo();
    },
    [sincronizarCambioCatalogo],
  );

  const actualizarAlimento = useCallback(
    async (id: string, datos: Omit<DatosAlimento, 'id'>) => {
      CatalogoRepositorio.obtenerInstancia().actualizar(id, datos);
      const snapshot = CatalogoRepositorio.obtenerInstancia().obtenerSnapshot();
      const store = useAGSStore.getState();
      store.setCatalogo(snapshot);
      store.setResultadoComparativa(null);
      store.setResultadoExperimentos(null);
      store.setCatalogoModificadoSinEjecutar(true);

      if (store.dietaHumana.idsSeleccionados.length > 0) {
        store.setDietaHumana({
          ...store.dietaHumana,
          evaluacion: evaluarSeleccionHumana(
            snapshot,
            store.dietaHumana.idsSeleccionados,
            store.configuracion.restricciones,
          ),
        });
      }

      await reiniciar();
    },
    [reiniciar],
  );

  const eliminarAlimento = useCallback(
    async (id: string) => {
      CatalogoRepositorio.obtenerInstancia().eliminar(id);
      await sincronizarCambioCatalogo();
    },
    [sincronizarCambioCatalogo],
  );

  const restaurarCatalogoOriginal = useCallback(async () => {
    CatalogoRepositorio.obtenerInstancia().restaurarPorDefecto();
    await sincronizarCambioCatalogo();
  }, [sincronizarCambioCatalogo]);

  // Comparativa multi-corrida (R corridas)
  const ejecutarComparativa = useCallback(async (cantidadCorridas = 10) => {
    const store = useAGSStore.getState();
    if (store.comparativaCargando) return;

    store.setComparativaCargando(true);
    store.setComparativaProgreso({ completadas: 0, total: cantidadCorridas });

    try {
      const catalogoSnapshot = CatalogoRepositorio.obtenerInstancia().obtenerSnapshot();
      const configuracionSnapshot = ConfiguracionGlobal.obtenerInstancia().obtenerSnapshot();
      const worker = obtenerWorkerAGS();

      const resultado = await worker.ejecutarComparativaMultiCorrida(
        catalogoSnapshot,
        configuracionSnapshot,
        cantidadCorridas,
        proxy((progreso: ProgresoComparativa) => {
          useAGSStore.getState().setComparativaProgreso(progreso);
        }),
      );

      useAGSStore.getState().setResultadoComparativa(resultado);
    } finally {
      useAGSStore.getState().setComparativaCargando(false);
      useAGSStore.getState().setComparativaProgreso(null);
    }
  }, []);

  const cancelarComparativa = useCallback(async () => {
    await obtenerWorkerAGS().cancelarComparativa();
  }, []);

  // Modo Selección Humana
  const iniciarModoHumano = useCallback(() => {
    useAGSStore.getState().setDietaHumana({
      ...DIETA_HUMANA_INICIAL,
      enCurso: true,
      inicioTimestampMs: Date.now(),
    });
  }, []);

  const alternarAlimentoHumano = useCallback((idAlimento: string) => {
    const store = useAGSStore.getState();
    const actual = store.dietaHumana;
    const inicio = actual.inicioTimestampMs ?? Date.now();

    const existe = actual.idsSeleccionados.includes(idAlimento);
    const idsSiguientes = existe
      ? actual.idsSeleccionados.filter((id) => id !== idAlimento)
      : [...actual.idsSeleccionados, idAlimento];

    const evaluacion = evaluarSeleccionHumana(
      store.catalogo,
      idsSiguientes,
      store.configuracion.restricciones,
    );

    store.setDietaHumana({
      idsSeleccionados: idsSiguientes,
      evaluacion,
      enCurso: true,
      finalizada: false,
      inicioTimestampMs: inicio,
      tiempoSegundos: Number(((Date.now() - inicio) / 1000).toFixed(1)),
    });
  }, []);

  const finalizarModoHumano = useCallback(() => {
    const store = useAGSStore.getState();
    const actual = store.dietaHumana;
    const tiempoSegundos =
      actual.inicioTimestampMs !== null
        ? Number(((Date.now() - actual.inicioTimestampMs) / 1000).toFixed(1))
        : actual.tiempoSegundos;

    store.setDietaHumana({
      ...actual,
      enCurso: false,
      finalizada: true,
      tiempoSegundos,
    });
  }, []);

  const reiniciarModoHumano = useCallback(() => {
    useAGSStore.getState().setDietaHumana(DIETA_HUMANA_INICIAL);
  }, []);

  // Experimentos (barrido Pc × Pm)
  const ejecutarExperimentos = useCallback(async (barrido: ConfiguracionBarridoExperimentos) => {
    const store = useAGSStore.getState();
    if (store.experimentosCargando) return;

    const total =
      barrido.valoresPc.length * barrido.valoresPm.length * barrido.corridasPorCombinacion;
    store.setExperimentosCargando(true);
    store.setExperimentosProgreso({
      completadas: 0,
      total,
      pcActual: barrido.valoresPc[0] ?? 0.8,
      pmActual: barrido.valoresPm[0] ?? 0.03,
    });

    try {
      const catalogoSnapshot = CatalogoRepositorio.obtenerInstancia().obtenerSnapshot();
      const configuracionSnapshot = ConfiguracionGlobal.obtenerInstancia().obtenerSnapshot();
      const worker = obtenerWorkerAGS();

      const resultado = await worker.ejecutarBarridoExperimentos(
        catalogoSnapshot,
        configuracionSnapshot,
        barrido,
        proxy((progreso: ProgresoExperimentos) => {
          useAGSStore.getState().setExperimentosProgreso(progreso);
        }),
      );

      useAGSStore.getState().setResultadoExperimentos(resultado);
    } finally {
      useAGSStore.getState().setExperimentosCargando(false);
      useAGSStore.getState().setExperimentosProgreso(null);
    }
  }, []);

  const cancelarExperimentos = useCallback(async () => {
    await obtenerWorkerAGS().cancelarExperimentos();
  }, []);

  // Navegación y modales
  const cambiarVista = useCallback((vista: VistaActiva) => {
    useAGSStore.getState().setVistaActiva(vista);
  }, []);

  const abrirModalModelo = useCallback(() => {
    useAGSStore.getState().setModalModeloAbierto(true);
  }, []);

  const cerrarModalModelo = useCallback(() => {
    useAGSStore.getState().setModalModeloAbierto(false);
  }, []);

  const limpiarNotificacion = useCallback(() => {
    useAGSStore.getState().setNotificacionPendiente(false);
  }, []);

  // Perfil corporal y aplicación al AGS
  const actualizarPerfilUsuario = useCallback((parcial: Partial<PerfilUsuario>) => {
    const snapshot = PerfilRepositorio.obtenerInstancia().actualizar(parcial);
    useAGSStore.getState().setPerfilUsuario(snapshot);
  }, []);

  const restaurarPerfilPorDefecto = useCallback(() => {
    const snapshot = PerfilRepositorio.obtenerInstancia().restaurarPorDefecto();
    useAGSStore.getState().setPerfilUsuario(snapshot);
  }, []);

  const aplicarPerfilAlAGS = useCallback(
    async (ejecutarInmediatamente = false) => {
      const perfil = PerfilRepositorio.obtenerInstancia().obtenerSnapshot();
      const evaluacion = calcularEvaluacionCorporal(perfil);

      actualizarRestricciones({
        maxCalorias: evaluacion.caloriasObjetivo,
        presupuesto: perfil.presupuestoDiario,
      });

      const store = useAGSStore.getState();
      store.setPerfilAplicado(true);
      store.setResultadoComparativa(null);
      store.setResultadoExperimentos(null);

      if (ejecutarInmediatamente) {
        cambiarVista('resumen');
        await ejecutar();
      } else {
        await reiniciar();
      }
    },
    [actualizarRestricciones, cambiarVista, ejecutar, reiniciar],
  );

  return {
    ejecutar,
    pausar,
    reanudar,
    detener,
    reiniciar,
    actualizarRestricciones,
    actualizarParametros,
    restaurarConfiguracionPorDefecto,
    generarNuevaSemilla,
    actualizarPerfilUsuario,
    restaurarPerfilPorDefecto,
    aplicarPerfilAlAGS,
    agregarAlimento,
    actualizarAlimento,
    eliminarAlimento,
    restaurarCatalogoOriginal,
    ejecutarComparativa,
    cancelarComparativa,
    iniciarModoHumano,
    alternarAlimentoHumano,
    finalizarModoHumano,
    reiniciarModoHumano,
    ejecutarExperimentos,
    cancelarExperimentos,
    cambiarVista,
    abrirModalModelo,
    cerrarModalModelo,
    limpiarNotificacion,
  };
}
