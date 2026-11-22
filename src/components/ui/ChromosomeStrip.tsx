import { motion, useReducedMotion } from 'motion/react';
import type { Cromosoma, DatosAlimento } from '../../models/types';

export interface ChromosomeStripProps {
  cromosoma: Cromosoma | null;
  catalogo: readonly DatosAlimento[];
  destelloConvergencia?: boolean;
  className?: string;
}

/**
 * Tarjeta del cromosoma binario de longitud N en rejilla de 15 columnas × 2 filas (30 celdas)
 * ocupando el 100 % del ancho, con animación flip rotateX escalonada cuando cambian los bits.
 */
export function ChromosomeStrip({
  cromosoma,
  catalogo,
  destelloConvergencia = false,
  className = '',
}: ChromosomeStripProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const genes: readonly (0 | 1)[] =
    cromosoma && cromosoma.length === catalogo.length
      ? cromosoma
      : new Array<0>(catalogo.length).fill(0);

  const activos = genes.filter((g) => g === 1).length;

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={prefersReduced ? undefined : { y: -5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`glass-card p-5 ${destelloConvergencia ? 'glass-card-converge' : ''} ${className}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-white">Cromosoma binario (N = {genes.length})</span>
        <span className="rounded-full bg-white/[0.08] px-2.5 py-0.5 font-mono text-xs text-white/65 tabular-nums">
          {activos} activos
        </span>
      </div>

      <div
        className="grid w-full grid-cols-[repeat(15,minmax(0,1fr))] gap-1"
        style={{ perspective: 500 }}
        role="list"
        aria-label={`Cromosoma de longitud ${genes.length}`}
      >
        {genes.map((gen, idx) => {
          const alimento = catalogo[idx];
          const activo = gen === 1;
          return (
            <motion.span
              key={`${idx}-${gen}`}
              role="listitem"
              initial={prefersReduced ? false : { rotateX: -90, opacity: 0.35 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={
                prefersReduced
                  ? { duration: 0 }
                  : { delay: idx * 0.015, duration: 0.32, ease: 'easeOut' }
              }
              title={
                alimento
                  ? `[${idx + 1}] ${alimento.nombre}: ${activo ? 'Incluido (1)' : 'Excluido (0)'}`
                  : `Gen ${idx + 1}: ${gen}`
              }
              className={`flex h-7 w-full items-center justify-center rounded-md font-mono text-xs font-semibold ${
                activo
                  ? 'border border-[#4F8CFF]/65 bg-[#4F8CFF]/30 text-white shadow-[0_0_10px_rgba(79,140,255,0.45)]'
                  : 'border border-white/8 bg-white/[0.04] text-white/40'
              }`}
            >
              {gen}
            </motion.span>
          );
        })}
      </div>
    </motion.div>
  );
}
