import { Bell, Hash, LayoutGrid, Pause, Play, Square } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { MotivoParo } from '../../models/types';
import type { EstadoEjecucion, VistaActiva } from '../../store/useAGSStore';

export interface DetallesCorridaTopbar {
  readonly cantidadAlimentos: number;
  readonly tamanoPoblacion: number;
  readonly maxGeneraciones: number;
  readonly semilla: number;
  readonly tiempoMs: number | null;
  readonly motivoParo: MotivoParo | null;
}

export interface TopbarProps {
  vistaActiva: VistaActiva;
  estadoEjecucion: EstadoEjecucion;
  generacionActual: number;
  maxGeneraciones: number;
  semilla: number;
  notificacionPendiente: boolean;
  detallesCorrida: DetallesCorridaTopbar;
  onCambiarVista: (vista: VistaActiva) => void;
  onAlternarEjecucion: () => void;
  onDetener: () => void;
  onExportar: () => void;
  onClickCampana: () => void;
  onClickSemilla: () => void;
}

const PESTANAS: readonly { readonly id: VistaActiva; readonly etiqueta: string }[] = [
  { id: 'resumen', etiqueta: 'Resumen' },
  { id: 'configuracion', etiqueta: 'Configuración' },
  { id: 'catalogo', etiqueta: 'Catálogo' },
  { id: 'comparativa', etiqueta: 'Comparativa' },
  { id: 'experimentos', etiqueta: 'Experimentos' },
];

function describirMotivoParo(motivo: MotivoParo | null): string {
  switch (motivo) {
    case 'estancamiento':
      return 'Paro por estancamiento';
    case 'cancelado':
      return 'Detenido por usuario';
    case 'max_generaciones':
      return 'Máximo de generaciones';
    default:
      return 'Listo para ejecutar';
  }
}

function describirEstado(
  estado: EstadoEjecucion,
  generacion: number,
  maxGeneraciones: number,
): { texto: string; colorPunto: string; pulsando: boolean } {
  switch (estado) {
    case 'cargando':
      return { texto: 'Preparando...', colorPunto: '#4F8CFF', pulsando: true };
    case 'ejecutando':
      return {
        texto: `Gen ${generacion}/${maxGeneraciones}`,
        colorPunto: '#4F8CFF',
        pulsando: true,
      };
    case 'pausado':
      return {
        texto: `Pausado · ${generacion}/${maxGeneraciones}`,
        colorPunto: '#F5B85A',
        pulsando: false,
      };
    case 'finalizado':
      return {
        texto: `Finalizado · ${generacion} gen`,
        colorPunto: '#34D399',
        pulsando: false,
      };
    case 'detenido':
      return {
        texto: `Detenido · ${generacion} gen`,
        colorPunto: 'rgba(255,255,255,0.55)',
        pulsando: false,
      };
    default:
      return { texto: 'Inactivo', colorPunto: 'rgba(255,255,255,0.4)', pulsando: false };
  }
}

export function Topbar({
  vistaActiva,
  estadoEjecucion,
  generacionActual,
  maxGeneraciones,
  semilla,
  notificacionPendiente,
  detallesCorrida,
  onCambiarVista,
  onAlternarEjecucion,
  onDetener,
  onExportar,
  onClickCampana,
  onClickSemilla,
}: TopbarProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const estaCorriendo = estadoEjecucion === 'ejecutando' || estadoEjecucion === 'cargando';
  const estaPausado = estadoEjecucion === 'pausado';
  const estadoInfo = describirEstado(estadoEjecucion, generacionActual, maxGeneraciones);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
      {/* Pestañas de texto plano con guion corto subrayado animado (layoutId) */}
      <nav
        aria-label="Secciones principales"
        className="glass-scroll flex max-w-full items-center gap-5 overflow-x-auto py-1 sm:gap-7"
      >
        {PESTANAS.map((tab) => {
          const activa = vistaActiva === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onCambiarVista(tab.id)}
              className={`relative shrink-0 pb-2 text-sm font-medium transition-colors ${
                activa ? 'text-white' : 'text-white/55 hover:text-white/85'
              }`}
            >
              {tab.etiqueta}
              {activa ? (
                <motion.span
                  layoutId="topbar-tab-indicator"
                  transition={
                    prefersReduced
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 420, damping: 32 }
                  }
                  className="absolute bottom-0 left-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full bg-white"
                />
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Botones circulares de vidrio y estado de la corrida con tooltip detallado */}
      <div className="flex items-center gap-2.5">
        <div className="group relative hidden lg:block">
          <div
            tabIndex={0}
            className="flex cursor-default items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-white/80"
            aria-live="polite"
          >
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              {estadoInfo.pulsando && !prefersReduced ? (
                <motion.span
                  animate={{ scale: [1, 2, 1], opacity: [0.75, 0, 0.75] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: estadoInfo.colorPunto }}
                />
              ) : null}
              <span
                className="relative h-2 w-2 rounded-full"
                style={{
                  backgroundColor: estadoInfo.colorPunto,
                  boxShadow:
                    estadoInfo.pulsando || estadoEjecucion === 'finalizado'
                      ? `0 0 8px ${estadoInfo.colorPunto}`
                      : undefined,
                }}
              />
            </span>
            <span className="tabular-nums">{estadoInfo.texto}</span>
          </div>

          {/* Tooltip con todos los metadatos de la corrida */}
          <div
            role="tooltip"
            className="pointer-events-none absolute top-full right-0 z-40 mt-2 w-64 rounded-2xl border border-white/12 bg-[#1a1b1f]/95 p-3.5 text-xs opacity-0 shadow-2xl backdrop-blur-xl transition-all duration-150 group-focus-within:opacity-100 group-hover:translate-y-0.5 group-hover:opacity-100"
          >
            <p className="mb-2 font-semibold text-white">Detalles de la corrida</p>
            <dl className="space-y-1.5 text-white/70 tabular-nums">
              <div className="flex justify-between">
                <dt className="text-white/55">Catálogo</dt>
                <dd className="font-medium text-white">
                  N = {detallesCorrida.cantidadAlimentos} alimentos
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/55">Presupuesto</dt>
                <dd className="font-medium text-white">
                  {detallesCorrida.tamanoPoblacion} × {detallesCorrida.maxGeneraciones} gen
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/55">Semilla</dt>
                <dd className="font-medium text-white">#{detallesCorrida.semilla}</dd>
              </div>
              {detallesCorrida.tiempoMs !== null ? (
                <div className="flex justify-between">
                  <dt className="text-white/55">Tiempo</dt>
                  <dd className="font-medium text-emerald-300">
                    {detallesCorrida.tiempoMs.toFixed(1)} ms
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-white/10 pt-1.5">
                <dt className="text-white/55">Criterio</dt>
                <dd className="font-medium text-white">
                  {describirMotivoParo(detallesCorrida.motivoParo)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Botón circular con borde punteado: Ejecutar / Pausar / Reanudar */}
        <button
          type="button"
          onClick={onAlternarEjecucion}
          title={
            estaCorriendo ? 'Pausar ejecución' : estaPausado ? 'Reanudar ejecución' : 'Ejecutar AGS'
          }
          aria-label={
            estaCorriendo ? 'Pausar ejecución' : estaPausado ? 'Reanudar ejecución' : 'Ejecutar AGS'
          }
          className={`flex h-10 w-10 items-center justify-center rounded-full border border-dashed transition-all ${
            estaCorriendo
              ? 'border-[#4F8CFF] bg-[#4F8CFF]/25 text-white shadow-[0_0_14px_rgba(79,140,255,0.45)]'
              : 'border-white/35 bg-white/[0.08] text-white/85 hover:border-[#4F8CFF] hover:bg-[#4F8CFF]/20 hover:text-white'
          }`}
        >
          {estaCorriendo ? <Pause size={16} /> : <Play size={16} className="translate-x-[1px]" />}
        </button>

        {/* Botón detener solo visible mientras corre o está pausado */}
        {estaCorriendo || estaPausado ? (
          <button
            type="button"
            onClick={onDetener}
            title="Detener corrida"
            aria-label="Detener corrida"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-400/35 bg-rose-500/15 text-rose-300 transition-colors hover:bg-rose-500/25"
          >
            <Square size={14} />
          </button>
        ) : null}

        {/* Botón circular: Exportar */}
        <button
          type="button"
          onClick={onExportar}
          title="Exportar resultados (JSON / CSV)"
          aria-label="Exportar resultados"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-white/75 transition-colors hover:bg-white/15 hover:text-white"
        >
          <LayoutGrid size={16} />
        </button>

        {/* Botón circular: Campana / Estado con punto azul al finalizar */}
        <button
          type="button"
          onClick={onClickCampana}
          title={`Estado: ${estadoInfo.texto}`}
          aria-label={`Estado de la corrida: ${estadoInfo.texto}`}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-white/75 transition-colors hover:bg-white/15 hover:text-white"
        >
          <Bell size={16} />
          {notificacionPendiente ? (
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-[#4F8CFF] shadow-[0_0_8px_#4F8CFF]" />
          ) : null}
        </button>

        {/* Semilla determinista */}
        <button
          type="button"
          onClick={onClickSemilla}
          title={`Semilla reproducible actual: ${semilla} (clic para configurar)`}
          aria-label={`Semilla actual ${semilla}`}
          className="flex h-10 items-center gap-1 rounded-full border border-white/15 bg-white/[0.11] px-3 text-xs font-semibold text-white tabular-nums transition-colors hover:border-[#4F8CFF]/60 hover:bg-white/18"
        >
          <Hash size={13} className="text-[#4F8CFF]" />
          <span>{semilla}</span>
        </button>
      </div>
    </header>
  );
}
