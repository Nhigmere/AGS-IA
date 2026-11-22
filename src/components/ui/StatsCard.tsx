import { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { animate, motion, useReducedMotion } from 'motion/react';

export interface OpcionSegmento<T extends string = string> {
  readonly valor: T;
  readonly etiqueta: string;
}

export interface StatsCardProps<T extends string = string> {
  titulo: string;
  valorNumerico: number;
  formatearValor?: (valor: number) => string;
  sufijo?: string;
  comparacion?: string;
  cambioTexto?: string;
  positivo?: boolean;
  icono: LucideIcon;
  segmentos?: readonly OpcionSegmento<T>[];
  segmentoActivo?: T;
  onCambiarSegmento?: (valor: T) => void;
  destelloConvergencia?: boolean;
  className?: string;
}

/** Count-up animado de 600 ms con easeOut (respeta prefers-reduced-motion). */
function useNumeroAnimado(objetivo: number, desactivado: boolean): number {
  const [actual, setActual] = useState(objetivo);
  const actualRef = useRef(objetivo);

  useEffect(() => {
    if (desactivado) {
      actualRef.current = objetivo;
      return;
    }

    const origen = actualRef.current;
    if (Math.abs(objetivo - origen) < 0.001) return;

    const controles = animate(origen, objetivo, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (valor) => {
        actualRef.current = valor;
        setActual(valor);
      },
    });

    return () => controles.stop();
  }, [objetivo, desactivado]);

  return desactivado ? objetivo : actual;
}

export function StatsCard<T extends string = string>({
  titulo,
  valorNumerico,
  formatearValor = (v) => v.toFixed(1),
  sufijo,
  comparacion,
  cambioTexto,
  positivo = true,
  icono: Icono,
  segmentos,
  segmentoActivo,
  onCambiarSegmento,
  destelloConvergencia = false,
  className = '',
}: StatsCardProps<T>) {
  const prefersReduced = useReducedMotion() ?? false;
  const valorMostrado = useNumeroAnimado(valorNumerico, prefersReduced);

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={prefersReduced ? undefined : { y: -5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`glass-card flex flex-col justify-between p-5 sm:p-6 ${
        destelloConvergencia ? 'glass-card-converge' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-white/55 sm:text-sm">{titulo}</p>

        {segmentos && segmentos.length > 0 && onCambiarSegmento ? (
          <div
            className="flex items-center rounded-full border border-white/10 bg-black/20 p-0.5"
            role="tablist"
            aria-label={`Opciones de ${titulo}`}
          >
            {segmentos.map((seg) => {
              const activo = seg.valor === segmentoActivo;
              return (
                <button
                  key={seg.valor}
                  type="button"
                  role="tab"
                  aria-selected={activo}
                  onClick={() => onCambiarSegmento(seg.valor)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    activo
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-white/55 hover:text-white/85'
                  }`}
                >
                  {seg.etiqueta}
                </button>
              );
            })}
          </div>
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-white/75">
            <Icono size={18} />
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="flex flex-wrap items-baseline gap-1.5">
          <h2 className="text-3xl font-semibold tracking-tight text-white tabular-nums">
            {formatearValor(valorMostrado)}
            {sufijo ? (
              <span className="ml-0.5 text-base font-medium text-white/55">{sufijo}</span>
            ) : null}
          </h2>
          {comparacion ? (
            <span className="text-sm font-medium text-white/55 tabular-nums">{comparacion}</span>
          ) : null}
        </div>

        {cambioTexto ? (
          <div className="mt-2.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                positivo ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300'
              }`}
            >
              {positivo ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>{cambioTexto}</span>
            </span>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
