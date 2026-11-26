import { BookOpen, Settings, Square } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { EstadoEjecucion, VistaActiva } from '../../store/useAGSStore';

export interface TopbarProps {
  vistaActiva: VistaActiva;
  estadoEjecucion: EstadoEjecucion;
  generacionActual: number;
  maxGeneraciones: number;
  onCambiarVista: (vista: VistaActiva) => void;
  onDetener: () => void;
  onAbrirModelo: () => void;
}

const PESTANAS_PRINCIPALES: readonly { readonly id: VistaActiva; readonly etiqueta: string }[] = [
  { id: 'perfil', etiqueta: '1. Tus datos' },
  { id: 'resumen', etiqueta: '2. Tu menú' },
  { id: 'progreso', etiqueta: '3. Tu progreso' },
  { id: 'catalogo', etiqueta: 'Alimentos' },
];

export function Topbar({
  vistaActiva,
  estadoEjecucion,
  generacionActual,
  maxGeneraciones,
  onCambiarVista,
  onDetener,
  onAbrirModelo,
}: TopbarProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const estaCorriendo = estadoEjecucion === 'ejecutando' || estadoEjecucion === 'cargando';

  return (
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
      {/* Navegación principal guiada en 3 pasos + Alimentos */}
      <nav
        aria-label="Navegación principal"
        className="glass-scroll flex max-w-full items-center gap-1.5 overflow-x-auto sm:gap-2"
      >
        {PESTANAS_PRINCIPALES.map((tab) => {
          const activa = vistaActiva === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onCambiarVista(tab.id)}
              className={`relative shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition-colors sm:text-sm ${
                activa
                  ? 'text-white'
                  : 'text-white/60 hover:bg-white/[0.06] hover:text-white/90'
              }`}
            >
              {activa ? (
                <motion.span
                  layoutId="topbar-pill-active"
                  transition={
                    prefersReduced
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 420, damping: 32 }
                  }
                  className="absolute inset-0 rounded-full border border-white/18 bg-white/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                />
              ) : null}
              <span className="relative z-10">{tab.etiqueta}</span>
            </button>
          );
        })}
      </nav>

      {/* Utilidades discretas a la derecha (solo lo esencial) */}
      <div className="flex items-center gap-2">
        {estaCorriendo ? (
          <div className="flex items-center gap-2 rounded-full border border-[#4F8CFF]/45 bg-[#4F8CFF]/20 px-3 py-1.5 text-xs font-medium text-white tabular-nums">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#4F8CFF]" />
            <span>
              Calculando {generacionActual}/{maxGeneraciones}
            </span>
            <button
              type="button"
              onClick={onDetener}
              title="Detener cálculo"
              aria-label="Detener cálculo"
              className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/30 text-rose-200 hover:bg-rose-500/50"
            >
              <Square size={10} />
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onAbrirModelo}
          title="Ver fórmulas matemáticas (KaTeX)"
          aria-label="Ver fórmulas matemáticas"
          className="glass-chip flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/75 transition-colors hover:bg-white/15 hover:text-white"
        >
          <BookOpen size={14} />
          <span className="hidden sm:inline">Fórmulas</span>
        </button>

        <button
          type="button"
          onClick={() => onCambiarVista('configuracion')}
          title="Ajustes avanzados del Algoritmo Genético"
          aria-label="Ajustes avanzados del AGS"
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            vistaActiva === 'configuracion'
              ? 'border-[#4F8CFF]/60 bg-[#4F8CFF]/25 text-white'
              : 'border-white/11 bg-white/[0.08] text-white/75 hover:bg-white/15 hover:text-white'
          }`}
        >
          <Settings size={14} />
          <span className="hidden sm:inline">Ajustes AGS</span>
        </button>
      </div>
    </header>
  );
}
