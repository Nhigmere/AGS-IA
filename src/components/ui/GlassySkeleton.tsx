interface GlassySkeletonProps {
  className?: string;
}

export function GlassySkeleton({ className = '' }: GlassySkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`glass-shimmer rounded-2xl border border-white/10 ${className}`}
    />
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="glass-card p-5 sm:p-6" role="status" aria-label="Cargando indicador">
      <div className="flex items-start justify-between gap-3">
        <div className="w-full space-y-3">
          <GlassySkeleton className="h-3.5 w-28 rounded-full" />
          <div className="flex items-baseline gap-2">
            <GlassySkeleton className="h-8 w-24 rounded-xl" />
            <GlassySkeleton className="h-4 w-16 rounded-full" />
          </div>
          <GlassySkeleton className="h-3.5 w-32 rounded-full" />
        </div>
        <GlassySkeleton className="h-9 w-9 shrink-0 rounded-full" />
      </div>
    </div>
  );
}

export function GaugeSkeleton() {
  return (
    <div
      className="glass-card flex flex-col justify-between p-5 sm:p-6"
      role="status"
      aria-label="Cargando medidor radial"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <GlassySkeleton className="h-4 w-32 rounded-full" />
          <GlassySkeleton className="h-3 w-24 rounded-full" />
        </div>
        <GlassySkeleton className="h-6 w-11 rounded-full" />
      </div>
      <div className="my-5 flex items-center justify-center">
        <GlassySkeleton className="h-44 w-44 rounded-full" />
      </div>
      <div className="space-y-2">
        <GlassySkeleton className="h-3 w-full rounded-full" />
        <GlassySkeleton className="h-2.5 w-3/4 rounded-full" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="glass-card p-5 sm:p-6" role="status" aria-label="Cargando gráfica">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <GlassySkeleton className="h-4 w-44 rounded-full" />
          <GlassySkeleton className="h-3 w-64 rounded-full" />
        </div>
        <GlassySkeleton className="h-7 w-36 rounded-full" />
      </div>
      <div className="flex h-60 items-end gap-2.5 px-2 pt-4">
        {[38, 52, 46, 65, 72, 78, 84, 86, 91, 93, 95, 96].map((altura, idx) => (
          <div
            key={idx}
            aria-hidden="true"
            style={{ height: `${altura}%` }}
            className="glass-shimmer flex-1 rounded-t-xl border border-white/10"
          />
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <GlassySkeleton className="h-3 w-12 rounded-full" />
        <GlassySkeleton className="h-3 w-12 rounded-full" />
        <GlassySkeleton className="h-3 w-12 rounded-full" />
        <GlassySkeleton className="h-3 w-12 rounded-full" />
      </div>
    </div>
  );
}

export function MenuListSkeleton({ filas = 6 }: { filas?: number }) {
  return (
    <div className="glass-card p-5 sm:p-6" role="status" aria-label="Cargando menú óptimo">
      <div className="mb-4 flex items-center justify-between">
        <div className="space-y-2">
          <GlassySkeleton className="h-4 w-32 rounded-full" />
          <GlassySkeleton className="h-3 w-24 rounded-full" />
        </div>
        <GlassySkeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: filas }).map((_, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.04] px-3.5 py-2.5"
          >
            <div className="space-y-1.5">
              <GlassySkeleton className="h-3.5 w-36 rounded-full" />
              <GlassySkeleton className="h-2.5 w-20 rounded-full" />
            </div>
            <GlassySkeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ filas = 6, columnas = 5 }: { filas?: number; columnas?: number }) {
  return (
    <div className="glass-card p-5 sm:p-6" role="status" aria-label="Cargando tabla">
      <div className="mb-4 flex items-center justify-between gap-3">
        <GlassySkeleton className="h-9 w-56 rounded-full" />
        <GlassySkeleton className="h-9 w-32 rounded-full" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: filas }).map((_, filaIdx) => (
          <div
            key={filaIdx}
            className="grid gap-3 border-b border-white/5 py-2.5"
            style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columnas }).map((__, colIdx) => (
              <GlassySkeleton key={colIdx} className="h-4 w-full rounded-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeatmapSkeleton({
  filas = 4,
  columnas = 4,
}: {
  filas?: number;
  columnas?: number;
}) {
  return (
    <div className="glass-card p-5 sm:p-6" role="status" aria-label="Cargando mapa de calor">
      <div className="mb-4 space-y-2">
        <GlassySkeleton className="h-4 w-52 rounded-full" />
        <GlassySkeleton className="h-3 w-72 rounded-full" />
      </div>
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: filas * columnas }).map((_, idx) => (
          <GlassySkeleton key={idx} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
