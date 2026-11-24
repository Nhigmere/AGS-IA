import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Cromosoma, DatosAlimento } from '../../models/types';
import { obtenerColorCategoria } from './categoryColors';

export interface ChromosomeStripProps {
  cromosoma: Cromosoma | null;
  catalogo: readonly DatosAlimento[];
  destelloConvergencia?: boolean;
  className?: string;
}

/**
 * Tarjeta interactiva del cromosoma binario de longitud N:
 * - Muestra la rejilla de bits (0/1) con animación flip rotateX escalonada.
 * - Permite inspeccionar cualquier bit al pasar el cursor o hacer clic.
 * - Muestra explícitamente el nombre de todos los alimentos seleccionados (bit = 1)
 *   enlazados con su número de gen (x₁…xₙ) y resaltado bidireccional.
 */
export function ChromosomeStrip({
  cromosoma,
  catalogo,
  destelloConvergencia = false,
  className = '',
}: ChromosomeStripProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const [indiceHover, setIndiceHover] = useState<number | null>(null);
  const [indiceFijado, setIndiceFijado] = useState<number | null>(null);

  const genes: readonly (0 | 1)[] =
    cromosoma && cromosoma.length === catalogo.length
      ? cromosoma
      : new Array<0>(catalogo.length).fill(0);

  const alimentosSeleccionados = genes
    .map((gen, idx) => ({ gen, idx, alimento: catalogo[idx] }))
    .filter(
      (item): item is { gen: 1; idx: number; alimento: DatosAlimento } =>
        item.gen === 1 && item.alimento !== undefined,
    );

  const activos = alimentosSeleccionados.length;
  const indiceInspeccionado =
    indiceHover !== null && indiceHover < catalogo.length
      ? indiceHover
      : indiceFijado !== null && indiceFijado < catalogo.length
        ? indiceFijado
        : null;

  const alimentoInspeccionado =
    indiceInspeccionado !== null ? catalogo[indiceInspeccionado] : null;
  const genInspeccionado = indiceInspeccionado !== null ? genes[indiceInspeccionado] : null;

  const columnasDesktop = Math.min(15, Math.max(1, genes.length));

  const alternarFijado = (idx: number) => {
    setIndiceFijado((prev) => (prev === idx ? null : idx));
  };

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={prefersReduced ? undefined : { y: -5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`glass-card flex flex-col gap-3 p-5 ${
        destelloConvergencia ? 'glass-card-converge' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-white">Cromosoma binario (N = {genes.length})</span>
        <span className="rounded-full bg-white/[0.08] px-2.5 py-0.5 font-mono text-xs text-white/65 tabular-nums">
          {activos} activos
        </span>
      </div>

      {/* Rejilla de bits interactiva */}
      <div
        className="grid w-full gap-1"
        style={{
          perspective: 500,
          gridTemplateColumns: `repeat(${columnasDesktop}, minmax(0, 1fr))`,
        }}
        role="list"
        aria-label={`Cromosoma de longitud ${genes.length}`}
      >
        {genes.map((gen, idx) => {
          const alimento = catalogo[idx];
          const activo = gen === 1;
          const resaltado = indiceInspeccionado === idx;

          return (
            <motion.button
              key={`${idx}-${gen}`}
              type="button"
              role="listitem"
              onMouseEnter={() => setIndiceHover(idx)}
              onMouseLeave={() => setIndiceHover((prev) => (prev === idx ? null : prev))}
              onFocus={() => setIndiceHover(idx)}
              onBlur={() => setIndiceHover((prev) => (prev === idx ? null : prev))}
              onClick={() => alternarFijado(idx)}
              initial={prefersReduced ? false : { rotateX: -90, opacity: 0.35 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={
                prefersReduced
                  ? { duration: 0 }
                  : { delay: Math.min(idx * 0.015, 0.45), duration: 0.32, ease: 'easeOut' }
              }
              title={
                alimento
                  ? `[x${idx + 1}] ${alimento.nombre}: ${activo ? 'Incluido (1)' : 'Excluido (0)'}`
                  : `Gen ${idx + 1}: ${gen}`
              }
              aria-label={
                alimento
                  ? `Gen ${idx + 1}, ${alimento.nombre}: ${activo ? 'incluido' : 'excluido'}`
                  : `Gen ${idx + 1}: ${gen}`
              }
              className={`flex h-7 w-full cursor-pointer items-center justify-center rounded-md font-mono text-xs font-semibold transition-all ${
                activo
                  ? 'border border-[#4F8CFF]/65 bg-[#4F8CFF]/30 text-white shadow-[0_0_10px_rgba(79,140,255,0.45)]'
                  : 'border border-white/8 bg-white/[0.04] text-white/40 hover:border-white/25 hover:text-white/75'
              } ${resaltado ? 'z-10 scale-110 ring-2 ring-white/90' : ''}`}
            >
              {gen}
            </motion.button>
          );
        })}
      </div>

      {/* Inspector en vivo del bit seleccionado / con cursor */}
      <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px]">
        {alimentoInspeccionado && indiceInspeccionado !== null ? (
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                x{indiceInspeccionado + 1}
              </span>
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: obtenerColorCategoria(alimentoInspeccionado.categoria) }}
              />
              <span className="truncate font-medium text-white">
                {alimentoInspeccionado.nombre}
              </span>
            </div>
            <div className="flex items-center gap-2 tabular-nums">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  genInspeccionado === 1
                    ? 'bg-[#4F8CFF]/25 text-[#9BC0FF]'
                    : 'bg-white/10 text-white/55'
                }`}
              >
                {genInspeccionado === 1 ? 'Incluido (1)' : 'Excluido (0)'}
              </span>
              <span className="text-white/65">
                {alimentoInspeccionado.proteina.toFixed(1)} g · {alimentoInspeccionado.calorias}{' '}
                kcal · ${alimentoInspeccionado.costo}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-white/45">
            Pasa el cursor o haz clic en un bit para inspeccionar su alimento.
          </p>
        )}
      </div>

      {/* Nombres visibles de los alimentos seleccionados (gen = 1) */}
      <div className="space-y-2 border-t border-white/10 pt-2.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-medium text-white/70">Alimentos seleccionados (bit = 1)</span>
          <span className="font-mono text-white/45 tabular-nums">
            {activos}/{genes.length}
          </span>
        </div>

        {alimentosSeleccionados.length === 0 ? (
          <p className="text-[11px] text-white/45">
            Ejecuta el AGS para ver aquí los nombres de los alimentos elegidos en cada bit activo.
          </p>
        ) : (
          <div className="glass-scroll flex max-h-48 flex-wrap gap-1.5 overflow-y-auto pr-1">
            {alimentosSeleccionados.map(({ idx, alimento }) => {
              const resaltado = indiceInspeccionado === idx;
              const colorCat = obtenerColorCategoria(alimento.categoria);

              return (
                <button
                  key={alimento.id}
                  type="button"
                  onMouseEnter={() => setIndiceHover(idx)}
                  onMouseLeave={() => setIndiceHover((prev) => (prev === idx ? null : prev))}
                  onClick={() => alternarFijado(idx)}
                  className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-[11px] transition-all ${
                    resaltado
                      ? 'border-white/70 bg-[#4F8CFF]/35 text-white shadow-[0_0_10px_rgba(79,140,255,0.4)]'
                      : 'border-[#4F8CFF]/35 bg-[#4F8CFF]/15 text-white/90 hover:border-[#4F8CFF]/70 hover:bg-[#4F8CFF]/25'
                  }`}
                >
                  <span className="shrink-0 font-mono text-[10px] font-semibold text-[#9BC0FF]">
                    x{idx + 1}
                  </span>
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: colorCat }}
                  />
                  <span className="truncate font-medium">{alimento.nombre}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
