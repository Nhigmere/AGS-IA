import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Cromosoma, DatosAlimento } from '../../models/types';
import { obtenerColorCategoria } from '../ui/categoryColors';

export interface OptimalMenuCardProps {
  catalogo: readonly DatosAlimento[];
  cromosoma: Cromosoma | null;
  proteinaTotal: number;
  caloriasTotales: number;
  costoTotal: number;
  factible: boolean;
  destelloConvergencia?: boolean;
  className?: string;
}

export function OptimalMenuCard({
  catalogo,
  cromosoma,
  proteinaTotal,
  caloriasTotales,
  costoTotal,
  factible,
  destelloConvergencia = false,
  className = '',
}: OptimalMenuCardProps) {
  const prefersReduced = useReducedMotion() ?? false;

  const seleccionados: DatosAlimento[] =
    cromosoma && cromosoma.length === catalogo.length
      ? catalogo.filter((_, idx) => cromosoma[idx] === 1)
      : [];

  const maxProteinaItem = seleccionados.reduce((max, item) => Math.max(max, item.proteina), 0);

  // Agrupación visual por categoría (pura presentación)
  const grupos = new Map<string, DatosAlimento[]>();
  for (const item of seleccionados) {
    const lista = grupos.get(item.categoria) ?? [];
    lista.push(item);
    grupos.set(item.categoria, lista);
  }

  let indiceGlobal = 0;

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={prefersReduced ? undefined : { y: -5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`glass-card flex flex-col p-5 sm:p-6 ${
        destelloConvergencia ? 'glass-card-converge' : ''
      } ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Menú diario óptimo</h3>
          <p className="mt-0.5 text-xs text-white/55">
            {seleccionados.length} alimentos seleccionados (gen = 1)
          </p>
        </div>

        {cromosoma ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
              factible ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300'
            }`}
          >
            {factible ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {factible ? 'Factible' : 'Excede límite'}
          </span>
        ) : null}
      </div>

      {seleccionados.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center">
          <p className="text-sm font-medium text-white/75">Aún no hay un menú calculado</p>
          <p className="mt-1 text-xs text-white/55">
            Al ejecutar el AGS aparecerán aquí las porciones seleccionadas por categoría.
          </p>
        </div>
      ) : (
        <>
          <div className="glass-scroll max-h-[32rem] flex-1 space-y-4 overflow-y-auto pr-1 xl:max-h-none">
            {Array.from(grupos.entries()).map(([categoria, items]) => (
              <div key={categoria}>
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: obtenerColorCategoria(items[0].categoria),
                    }}
                  />
                  <p className="text-xs font-semibold tracking-wide text-white/55 uppercase">
                    {categoria}
                  </p>
                </div>

                <ul className="divide-y divide-white/5">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {items.map((item) => {
                      const posicion = indiceGlobal++;
                      const colorCat = obtenerColorCategoria(item.categoria);
                      const anchoRelativo =
                        maxProteinaItem > 0 ? (item.proteina / maxProteinaItem) * 100 : 0;

                      return (
                        <motion.li
                          key={item.id}
                          layout={!prefersReduced}
                          initial={prefersReduced ? false : { opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={prefersReduced ? undefined : { opacity: 0, x: 8 }}
                          transition={
                            prefersReduced
                              ? { duration: 0 }
                              : { delay: posicion * 0.04, duration: 0.25, ease: 'easeOut' }
                          }
                          className="py-2.5 transition-colors hover:bg-white/[0.03]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: colorCat }}
                              />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-white">
                                  {item.nombre}
                                </p>
                                <p className="text-xs text-white/55">{item.porcion}</p>
                              </div>
                            </div>

                            <div className="shrink-0 text-right tabular-nums">
                              <p className="text-xs font-semibold text-[#9BC0FF]">
                                {item.proteina.toFixed(1)} g
                              </p>
                              <p className="text-xs text-white/55">
                                {item.calorias} kcal · ${item.costo.toFixed(0)}
                              </p>
                            </div>
                          </div>

                          {/* Mini barra horizontal de proteína relativa */}
                          <div className="mt-1.5 ml-4.5 h-1 w-full max-w-[calc(100%-1.125rem)] overflow-hidden rounded-full bg-white/[0.07]">
                            <motion.div
                              initial={prefersReduced ? false : { width: 0 }}
                              animate={{ width: `${anchoRelativo}%` }}
                              transition={
                                prefersReduced
                                  ? { duration: 0 }
                                  : {
                                      delay: posicion * 0.04 + 0.08,
                                      duration: 0.4,
                                      ease: 'easeOut',
                                    }
                              }
                              className="h-full rounded-full"
                              style={{ backgroundColor: colorCat, opacity: 0.85 }}
                            />
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </div>
            ))}
          </div>

          {/* Totales del menú */}
          <div className="mt-4 border-t border-white/10 pt-3">
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-center text-xs tabular-nums">
              <div>
                <p className="text-xs text-white/55">Proteína</p>
                <p className="mt-0.5 text-sm font-semibold text-white">
                  {proteinaTotal.toFixed(1)} g
                </p>
              </div>
              <div>
                <p className="text-xs text-white/55">Calorías</p>
                <p className="mt-0.5 text-sm font-semibold text-white">
                  {Math.round(caloriasTotales).toLocaleString('es-MX')} kcal
                </p>
              </div>
              <div>
                <p className="text-xs text-white/55">Costo</p>
                <p className="mt-0.5 text-sm font-semibold text-white">${costoTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
