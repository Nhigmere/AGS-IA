import { motion, useReducedMotion } from 'motion/react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { ResumenCategoriaProteina } from '../../controllers/comparativa';
import { obtenerColorCategoria } from '../ui/categoryColors';

export interface ProteinByCategoryCardProps {
  categorias: readonly ResumenCategoriaProteina[];
  proteinaTotal: number;
  destelloConvergencia?: boolean;
  className?: string;
}

interface TooltipPieProps {
  active?: boolean;
  payload?: readonly {
    readonly payload?: ResumenCategoriaProteina;
  }[];
}

function GlassyDonutTooltip({ active, payload }: TooltipPieProps) {
  if (!active || !payload || !payload[0]?.payload) return null;
  const item = payload[0].payload;
  const color = obtenerColorCategoria(item.categoria);

  return (
    <div className="rounded-2xl border border-white/12 bg-[#1a1b1f]/95 px-3 py-2 text-xs shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-semibold text-white">{item.categoria}</span>
      </div>
      <p className="mt-1 text-white/75 tabular-nums">
        {item.proteina.toFixed(1)} g ({item.porcentaje.toFixed(1)}%) · {item.cantidad} ítems
      </p>
    </div>
  );
}

/**
 * Tarjeta "Proteína por categoría" (gráfica de dona) para equilibrar el Bento Grid
 * y visualizar la distribución de fuentes proteicas del menú óptimo.
 */
export function ProteinByCategoryCard({
  categorias,
  proteinaTotal,
  destelloConvergencia = false,
  className = '',
}: ProteinByCategoryCardProps) {
  const prefersReduced = useReducedMotion() ?? false;

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={prefersReduced ? undefined : { y: -5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`glass-card p-5 sm:p-6 ${destelloConvergencia ? 'glass-card-converge' : ''} ${className}`}
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Proteína por categoría</h3>
          <p className="mt-0.5 text-xs text-white/55">Distribución proteica del menú óptimo</p>
        </div>
        <span className="text-xs font-medium text-white/55 tabular-nums">
          {categorias.length} categorías
        </span>
      </div>

      {categorias.length === 0 ? (
        <div className="flex h-36 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-xs text-white/55">
          Ejecuta el AGS para ver el desglose por categoría.
        </div>
      ) : (
        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
          <div className="relative mx-auto h-40 w-40 sm:col-span-5">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[...categorias]}
                  dataKey="proteina"
                  nameKey="categoria"
                  innerRadius="62%"
                  outerRadius="88%"
                  paddingAngle={3}
                  stroke="rgba(26,27,31,0.65)"
                  strokeWidth={2}
                  isAnimationActive={!prefersReduced}
                  animationDuration={650}
                >
                  {categorias.map((c) => (
                    <Cell key={c.categoria} fill={obtenerColorCategoria(c.categoria)} />
                  ))}
                </Pie>
                <Tooltip content={<GlassyDonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-semibold text-white tabular-nums">
                {proteinaTotal.toFixed(1)}
              </span>
              <span className="text-xs text-white/55">g prot.</span>
            </div>
          </div>

          <ul className="space-y-2 sm:col-span-7">
            {categorias.map((c) => {
              const color = obtenerColorCategoria(c.categoria);
              return (
                <li key={c.categoria} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-white/80">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate">{c.categoria}</span>
                  </span>
                  <span className="shrink-0 font-medium text-white tabular-nums">
                    {c.proteina.toFixed(1)} g{' '}
                    <span className="text-white/55">({c.porcentaje.toFixed(0)}%)</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
