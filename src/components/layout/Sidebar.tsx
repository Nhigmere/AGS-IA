import {
  BarChart3,
  BookOpen,
  Download,
  FlaskConical,
  Home,
  Pause,
  Play,
  RotateCcw,
  Settings,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import type { EstadoEjecucion, VistaActiva } from '../../store/useAGSStore';

export interface SidebarProps {
  vistaActiva: VistaActiva;
  estadoEjecucion: EstadoEjecucion;
  onCambiarVista: (vista: VistaActiva) => void;
  onAlternarEjecucion: () => void;
  onReiniciar: () => void;
  onExportar: () => void;
  onAbrirModelo: () => void;
}

interface ItemNav {
  readonly id: VistaActiva;
  readonly etiqueta: string;
  readonly icono: LucideIcon;
}

const ITEMS_NAVEGACION: readonly ItemNav[] = [
  { id: 'resumen', etiqueta: 'Resumen', icono: Home },
  { id: 'catalogo', etiqueta: 'Catálogo', icono: UtensilsCrossed },
  { id: 'comparativa', etiqueta: 'Comparativa', icono: BarChart3 },
  { id: 'experimentos', etiqueta: 'Experimentos', icono: FlaskConical },
];

interface BotonIconoSidebarProps {
  etiqueta: string;
  activo?: boolean;
  resaltado?: boolean;
  icono: LucideIcon;
  onClick: () => void;
}

function BotonIconoSidebar({
  etiqueta,
  activo = false,
  resaltado = false,
  icono: Icono,
  onClick,
}: BotonIconoSidebarProps) {
  return (
    <div className="group relative flex items-center justify-center">
      <button
        type="button"
        onClick={onClick}
        aria-label={etiqueta}
        aria-current={activo ? 'page' : undefined}
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
          activo
            ? 'border border-white/20 bg-white/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
            : resaltado
              ? 'border border-[#4F8CFF]/50 bg-[#4F8CFF]/25 text-white hover:bg-[#4F8CFF]/40'
              : 'text-white/65 hover:bg-white/12 hover:text-white'
        }`}
      >
        <Icono size={18} strokeWidth={1.9} />
      </button>

      {/* Tooltip en chip de vidrio al hacer hover (estilo "Reports" de la referencia) */}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-14 z-30 hidden whitespace-nowrap rounded-full border border-white/15 bg-neutral-900/85 px-3 py-1 text-xs font-medium text-white opacity-0 shadow-lg backdrop-blur-xl transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100 md:block"
      >
        {etiqueta}
      </span>
    </div>
  );
}

export function Sidebar({
  vistaActiva,
  estadoEjecucion,
  onCambiarVista,
  onAlternarEjecucion,
  onReiniciar,
  onExportar,
  onAbrirModelo,
}: SidebarProps) {
  const estaCorriendo = estadoEjecucion === 'ejecutando' || estadoEjecucion === 'cargando';

  return (
    <>
      {/* Desktop / Tablet: píldora vertical izquierda */}
      <aside
        aria-label="Barra lateral de navegación y acciones"
        className="glass-pill hidden w-14 shrink-0 flex-col items-center justify-between rounded-full py-3 md:flex"
      >
        <div className="flex flex-col items-center gap-2">
          {ITEMS_NAVEGACION.map((item) => (
            <BotonIconoSidebar
              key={item.id}
              etiqueta={item.etiqueta}
              icono={item.icono}
              activo={vistaActiva === item.id}
              onClick={() => onCambiarVista(item.id)}
            />
          ))}

          <div className="my-1.5 h-px w-6 bg-white/12" aria-hidden="true" />

          <BotonIconoSidebar
            etiqueta={estaCorriendo ? 'Pausar AGS' : 'Ejecutar AGS'}
            icono={estaCorriendo ? Pause : Play}
            resaltado={estaCorriendo}
            onClick={onAlternarEjecucion}
          />
          <BotonIconoSidebar etiqueta="Exportar datos" icono={Download} onClick={onExportar} />
          <BotonIconoSidebar
            etiqueta="Acerca del modelo"
            icono={BookOpen}
            onClick={onAbrirModelo}
          />
        </div>

        {/* Grupo inferior separado: Configuración y Reiniciar */}
        <div className="flex flex-col items-center gap-2 pt-4">
          <div className="mb-1 h-px w-6 bg-white/12" aria-hidden="true" />
          <BotonIconoSidebar
            etiqueta="Configuración AGS"
            icono={Settings}
            activo={vistaActiva === 'configuracion'}
            onClick={() => onCambiarVista('configuracion')}
          />
          <BotonIconoSidebar etiqueta="Reiniciar corrida" icono={RotateCcw} onClick={onReiniciar} />
        </div>
      </aside>

      {/* Móvil: píldora horizontal flotante en la parte inferior */}
      <nav
        aria-label="Navegación móvil"
        className="glass-pill fixed inset-x-4 bottom-3 z-40 flex items-center justify-around rounded-full px-2 py-2 shadow-2xl md:hidden"
      >
        {ITEMS_NAVEGACION.map((item) => (
          <BotonIconoSidebar
            key={item.id}
            etiqueta={item.etiqueta}
            icono={item.icono}
            activo={vistaActiva === item.id}
            onClick={() => onCambiarVista(item.id)}
          />
        ))}
        <BotonIconoSidebar
          etiqueta="Configuración"
          icono={Settings}
          activo={vistaActiva === 'configuracion'}
          onClick={() => onCambiarVista('configuracion')}
        />
        <BotonIconoSidebar
          etiqueta={estaCorriendo ? 'Pausar' : 'Ejecutar'}
          icono={estaCorriendo ? Pause : Play}
          resaltado={estaCorriendo}
          onClick={onAlternarEjecucion}
        />
      </nav>
    </>
  );
}
