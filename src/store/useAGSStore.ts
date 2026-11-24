import { create } from 'zustand';
import type { EvaluacionDietaHumana } from '../controllers/comparativa';
import type {
  ConfiguracionEjecucion,
  DatosAlimento,
  ReporteGeneracion,
  ResultadoAleatorio,
  ResultadoEjecucionAGS,
} from '../models/types';
import { CatalogoRepositorio, ConfiguracionGlobal } from '../patterns/singleton';
import type {
  ProgresoComparativa,
  ProgresoExperimentos,
  ResultadoBarridoExperimentos,
  ResultadoComparativaMultiCorrida,
} from '../workers/types';

export type VistaActiva = 'resumen' | 'configuracion' | 'catalogo' | 'comparativa' | 'experimentos';

export type EstadoEjecucion =
  'inactivo' | 'cargando' | 'ejecutando' | 'pausado' | 'finalizado' | 'detenido';

export interface EstadoDietaHumana {
  readonly idsSeleccionados: readonly string[];
  readonly evaluacion: EvaluacionDietaHumana;
  readonly enCurso: boolean;
  readonly finalizada: boolean;
  readonly inicioTimestampMs: number | null;
  readonly tiempoSegundos: number;
}

export const EVALUACION_HUMANA_VACIA: EvaluacionDietaHumana = Object.freeze({
  proteinaTotal: 0,
  caloriasTotales: 0,
  costoTotal: 0,
  cantidadAlimentos: 0,
  factible: true,
  excedeCalorias: false,
  excedePresupuesto: false,
  porcentajeCalorias: 0,
  porcentajePresupuesto: 0,
});

export const DIETA_HUMANA_INICIAL: EstadoDietaHumana = Object.freeze({
  idsSeleccionados: [],
  evaluacion: EVALUACION_HUMANA_VACIA,
  enCurso: false,
  finalizada: false,
  inicioTimestampMs: null,
  tiempoSegundos: 0,
});

export interface AGSStoreState {
  vistaActiva: VistaActiva;
  modalModeloAbierto: boolean;
  notificacionPendiente: boolean;
  catalogoModificadoSinEjecutar: boolean;

  catalogo: readonly DatosAlimento[];
  configuracion: ConfiguracionEjecucion;

  estadoEjecucion: EstadoEjecucion;
  generacionActual: number;
  historialAGS: readonly ReporteGeneracion[];
  resultadoAGS: ResultadoEjecucionAGS | null;
  resultadoAleatorio: ResultadoAleatorio | null;
  errorEjecucion: string | null;

  comparativaCargando: boolean;
  comparativaProgreso: ProgresoComparativa | null;
  resultadoComparativa: ResultadoComparativaMultiCorrida | null;
  dietaHumana: EstadoDietaHumana;

  experimentosCargando: boolean;
  experimentosProgreso: ProgresoExperimentos | null;
  resultadoExperimentos: ResultadoBarridoExperimentos | null;

  // Setters internos consumidos exclusivamente por el Controller
  setVistaActiva: (vista: VistaActiva) => void;
  setModalModeloAbierto: (abierto: boolean) => void;
  setNotificacionPendiente: (pendiente: boolean) => void;
  setCatalogoModificadoSinEjecutar: (modificado: boolean) => void;
  setCatalogo: (catalogo: readonly DatosAlimento[]) => void;
  setConfiguracion: (configuracion: ConfiguracionEjecucion) => void;
  setEstadoEjecucion: (estado: EstadoEjecucion) => void;
  agregarReportesHistorial: (reportes: readonly ReporteGeneracion[]) => void;
  establecerResultadoEjecucion: (ags: ResultadoEjecucionAGS, aleatorio: ResultadoAleatorio) => void;
  setErrorEjecucion: (error: string | null) => void;
  reiniciarResultadosEjecucion: () => void;

  setComparativaCargando: (cargando: boolean) => void;
  setComparativaProgreso: (progreso: ProgresoComparativa | null) => void;
  setResultadoComparativa: (resultado: ResultadoComparativaMultiCorrida | null) => void;
  setDietaHumana: (dieta: EstadoDietaHumana) => void;

  setExperimentosCargando: (cargando: boolean) => void;
  setExperimentosProgreso: (progreso: ProgresoExperimentos | null) => void;
  setResultadoExperimentos: (resultado: ResultadoBarridoExperimentos | null) => void;
}

const catalogoInicialSnapshot = CatalogoRepositorio.obtenerInstancia().obtenerSnapshot();
const configuracionInicialSnapshot = ConfiguracionGlobal.obtenerInstancia().obtenerSnapshot();

export const useAGSStore = create<AGSStoreState>((set) => ({
  vistaActiva: 'resumen',
  modalModeloAbierto: false,
  notificacionPendiente: false,
  catalogoModificadoSinEjecutar: false,

  catalogo: catalogoInicialSnapshot,
  configuracion: configuracionInicialSnapshot,

  estadoEjecucion: 'inactivo',
  generacionActual: 0,
  historialAGS: [],
  resultadoAGS: null,
  resultadoAleatorio: null,
  errorEjecucion: null,

  comparativaCargando: false,
  comparativaProgreso: null,
  resultadoComparativa: null,
  dietaHumana: DIETA_HUMANA_INICIAL,

  experimentosCargando: false,
  experimentosProgreso: null,
  resultadoExperimentos: null,

  setVistaActiva: (vistaActiva) => set({ vistaActiva }),
  setModalModeloAbierto: (modalModeloAbierto) => set({ modalModeloAbierto }),
  setNotificacionPendiente: (notificacionPendiente) => set({ notificacionPendiente }),
  setCatalogoModificadoSinEjecutar: (catalogoModificadoSinEjecutar) =>
    set({ catalogoModificadoSinEjecutar }),
  setCatalogo: (catalogo) => set({ catalogo }),
  setConfiguracion: (configuracion) => set({ configuracion }),
  setEstadoEjecucion: (estadoEjecucion) => set({ estadoEjecucion }),

  agregarReportesHistorial: (reportes) =>
    set((state) => {
      if (reportes.length === 0 || state.estadoEjecucion === 'finalizado') return state;
      const ultimaGenExistente =
        state.historialAGS.length > 0
          ? state.historialAGS[state.historialAGS.length - 1].generacion
          : 0;
      const nuevos = reportes.filter((r) => r.generacion > ultimaGenExistente);
      if (nuevos.length === 0) return state;
      const ultimo = nuevos[nuevos.length - 1];
      return {
        historialAGS: [...state.historialAGS, ...nuevos],
        generacionActual: ultimo.generacion,
      };
    }),

  establecerResultadoEjecucion: (resultadoAGS, resultadoAleatorio) =>
    set({
      resultadoAGS,
      resultadoAleatorio,
      historialAGS: resultadoAGS.historial,
      generacionActual: resultadoAGS.generacionesEjecutadas,
      estadoEjecucion: resultadoAGS.motivoParo === 'cancelado' ? 'detenido' : 'finalizado',
      notificacionPendiente: resultadoAGS.motivoParo !== 'cancelado',
    }),

  setErrorEjecucion: (errorEjecucion) => set({ errorEjecucion }),

  reiniciarResultadosEjecucion: () =>
    set({
      estadoEjecucion: 'inactivo',
      generacionActual: 0,
      historialAGS: [],
      resultadoAGS: null,
      resultadoAleatorio: null,
      errorEjecucion: null,
      notificacionPendiente: false,
    }),

  setComparativaCargando: (comparativaCargando) => set({ comparativaCargando }),
  setComparativaProgreso: (comparativaProgreso) => set({ comparativaProgreso }),
  setResultadoComparativa: (resultadoComparativa) => set({ resultadoComparativa }),
  setDietaHumana: (dietaHumana) => set({ dietaHumana }),

  setExperimentosCargando: (experimentosCargando) => set({ experimentosCargando }),
  setExperimentosProgreso: (experimentosProgreso) => set({ experimentosProgreso }),
  setResultadoExperimentos: (resultadoExperimentos) => set({ resultadoExperimentos }),
}));
