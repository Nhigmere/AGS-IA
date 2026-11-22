import { useState } from 'react';
import { Check, ChevronsRight, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

export interface SlideConfirmCardProps {
  etiquetaBadge: string;
  cifraPrincipal: string;
  descripcion: string;
  textoAccion?: string;
  textoConfirmado?: string;
  onConfirmar: () => void;
  deshabilitado?: boolean;
  destelloConvergencia?: boolean;
  className?: string;
}

/**
 * Tarjeta de acción inspirada en el módulo "Discount" de Glassy Dashboard V30:
 * badge azul pequeño, cifra destacada, texto secundario y control deslizable `>>>` con check.
 */
export function SlideConfirmCard({
  etiquetaBadge,
  cifraPrincipal,
  descripcion,
  textoAccion = 'Exportar menú',
  textoConfirmado = 'Listo',
  onConfirmar,
  deshabilitado = false,
  destelloConvergencia = false,
  className = '',
}: SlideConfirmCardProps) {
  const [confirmado, setConfirmado] = useState(false);
  const prefersReduced = useReducedMotion() ?? false;

  const dispararAccion = () => {
    if (deshabilitado) return;
    setConfirmado(true);
    onConfirmar();
    window.setTimeout(() => setConfirmado(false), 1800);
  };

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={prefersReduced ? undefined : { y: -5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`glass-card flex flex-col justify-between p-5 ${
        destelloConvergencia ? 'glass-card-converge' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-[#4F8CFF]/40 bg-[#4F8CFF]/20 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-[#9BC0FF] uppercase">
          <Sparkles size={12} />
          {etiquetaBadge}
        </span>
      </div>

      <div className="my-3">
        <p className="text-2xl font-bold tracking-tight text-white tabular-nums">
          {cifraPrincipal}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-white/55">{descripcion}</p>
      </div>

      <button
        type="button"
        disabled={deshabilitado}
        onClick={dispararAccion}
        className="group relative flex h-10 w-full items-center justify-between rounded-full border border-white/12 bg-black/25 px-3 text-xs font-medium text-white/80 transition-colors hover:border-white/25 hover:bg-black/35 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <span className="flex items-center gap-1.5 text-white/70 transition-transform group-hover:translate-x-1">
          <ChevronsRight size={15} className="text-[#4F8CFF]" />
          <span>{confirmado ? textoConfirmado : textoAccion}</span>
        </span>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
            confirmado
              ? 'border-emerald-400/50 bg-emerald-400/20 text-emerald-300'
              : 'border-white/15 bg-white/12 text-white group-hover:border-[#4F8CFF]/60 group-hover:bg-[#4F8CFF]'
          }`}
        >
          <Check size={14} />
        </span>
      </button>
    </motion.div>
  );
}
