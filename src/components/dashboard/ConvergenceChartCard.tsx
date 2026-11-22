import { useId, useMemo, type RefObject } from 'react';
import { Camera, FileSpreadsheet } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type LineDrawShapeProps,
} from 'recharts';
import type { PuntoGraficaConvergencia } from '../../controllers/comparativa';

export interface ConvergenceChartCardProps {
  datos: readonly PuntoGraficaConvergencia[];
  generacionConvergencia?: number;
  corridaKey?: string | number;
  chartRef?: RefObject<HTMLDivElement | null>;
  onExportarPNG?: () => void;
  onExportarCSV?: () => void;
  exportandoPNG?: boolean;
  destelloConvergencia?: boolean;
  titulo?: string;
  subtitulo?: string;
  className?: string;
}

interface TooltipPayloadItem {
  readonly dataKey?: string;
  readonly name?: string;
  readonly value?: number;
  readonly color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[];
  label?: number | string;
}

interface PuntoXY {
  readonly x: number;
  readonly y: number;
}

/** Construye una curva SVG cúbica monótona (Fritsch-Carlson) a partir de los puntos proyectados por Recharts. */
function construirPathMonotono(puntos: readonly PuntoXY[]): string {
  const n = puntos.length;
  if (n === 0) return '';
  if (n === 1) return `M ${puntos[0].x} ${puntos[0].y}`;
  if (n === 2) return `M ${puntos[0].x} ${puntos[0].y} L ${puntos[1].x} ${puntos[1].y}`;

  const dx: number[] = new Array(n - 1);
  const pendientes: number[] = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    dx[i] = puntos[i + 1].x - puntos[i].x;
    pendientes[i] = dx[i] !== 0 ? (puntos[i + 1].y - puntos[i].y) / dx[i] : 0;
  }

  const tangentes: number[] = new Array(n);
  tangentes[0] = pendientes[0];
  tangentes[n - 1] = pendientes[n - 2];

  for (let i = 1; i < n - 1; i++) {
    if (pendientes[i - 1] * pendientes[i] <= 0) {
      tangentes[i] = 0;
    } else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      tangentes[i] = (w1 + w2) / (w1 / pendientes[i - 1] + w2 / pendientes[i]);
    }
  }

  let d = `M ${puntos[0].x} ${puntos[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const paso = dx[i] / 3;
    const c1x = puntos[i].x + paso;
    const c1y = puntos[i].y + tangentes[i] * paso;
    const c2x = puntos[i + 1].x - paso;
    const c2y = puntos[i + 1].y - tangentes[i + 1] * paso;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${puntos[i + 1].x} ${puntos[i + 1].y}`;
  }
  return d;
}

function GlassyChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/12 bg-[#1a1b1f]/95 px-3.5 py-2.5 text-xs shadow-2xl backdrop-blur-xl">
      <p className="mb-1.5 font-semibold text-white">Generación {label}</p>
      <div className="space-y-1.5">
        {payload.map((entrada) => {
          const esAleatorio = entrada.dataKey === 'mejorAleatorio';
          const esMejor = entrada.dataKey === 'mejorFactibleAGS';
          const color = esMejor ? '#4F8CFF' : esAleatorio ? '#F5B85A' : 'rgba(255,255,255,0.65)';
          return (
            <div key={String(entrada.dataKey)} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-white/75">
                {esAleatorio ? (
                  <span
                    className="h-0.5 w-3 border-t-2 border-dashed"
                    style={{ borderColor: color }}
                  />
                ) : (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: color,
                      boxShadow: esMejor ? '0 0 6px #4F8CFF' : undefined,
                    }}
                  />
                )}
                {entrada.name}
              </span>
              <span className="font-semibold text-white tabular-nums">
                {typeof entrada.value === 'number' ? `${entrada.value.toFixed(1)} g` : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ConvergenceChartCard({
  datos,
  generacionConvergencia = 0,
  corridaKey = 0,
  chartRef,
  onExportarPNG,
  onExportarCSV,
  exportandoPNG = false,
  destelloConvergencia = false,
  titulo = 'Curva de convergencia',
  subtitulo = 'Mejor factible global AGS vs. promedio poblacional vs. búsqueda aleatoria',
  className = '',
}: ConvergenceChartCardProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const glowId = useId();
  const areaGradId = useId();

  // Dominio Y dinámico [min - 10 %, max + 5 %]
  const dominioY = useMemo<[number, number]>(() => {
    if (datos.length === 0) return [0, 100];
    let minVal = Number.POSITIVE_INFINITY;
    let maxVal = Number.NEGATIVE_INFINITY;

    for (const p of datos) {
      const candidatos = [p.mejorFactibleAGS, p.promedioAGS];
      if (p.mejorAleatorio !== null) candidatos.push(p.mejorAleatorio);
      for (const v of candidatos) {
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    }

    if (!Number.isFinite(minVal) || !Number.isFinite(maxVal)) return [0, 100];
    const inferior = Math.max(0, Math.floor(minVal * 0.9));
    const superior = Math.max(inferior + 10, Math.ceil(maxVal * 1.05));
    return [inferior, superior];
  }, [datos]);

  // Ticks del eje X cada 10 generaciones
  const ticksX = useMemo<number[]>(() => {
    if (datos.length === 0) return [];
    const maxGen = datos[datos.length - 1].generacion;
    const marcas: number[] = [];
    if (maxGen < 10) {
      marcas.push(1, maxGen);
      return Array.from(new Set(marcas));
    }
    for (let g = 10; g <= maxGen; g += 10) {
      marcas.push(g);
    }
    return marcas;
  }, [datos]);

  const renderLineaMejorAGS = (props: LineDrawShapeProps) => {
    const puntosValidos: PuntoXY[] = (props.points ?? []).filter(
      (p): p is { x: number; y: number } => typeof p.x === 'number' && typeof p.y === 'number',
    );

    const d = construirPathMonotono(puntosValidos);
    if (!d) return null;

    return (
      <motion.path
        key={`mejor-ags-${corridaKey}`}
        d={d}
        fill="none"
        stroke="#4F8CFF"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glowId})`}
        initial={prefersReduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={prefersReduced ? { duration: 0 } : { duration: 0.9, ease: 'easeOut' }}
      />
    );
  };

  return (
    <motion.div
      ref={chartRef}
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={prefersReduced ? undefined : { y: -5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`glass-card flex flex-col justify-between p-5 sm:p-6 ${
        destelloConvergencia ? 'glass-card-converge' : ''
      } ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{titulo}</h3>
          <p className="mt-0.5 text-xs text-white/55">{subtitulo}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Leyenda actualizada */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/65">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#4F8CFF] shadow-[0_0_8px_#4F8CFF]" />
              Mejor AGS
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-white/35 bg-gradient-to-b from-white/25 to-transparent" />
              Promedio
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 border-t-2 border-dashed border-[#F5B85A]" />
              Aleatorio
            </span>
          </div>

          {/* Botones de exportación como íconos en el header */}
          {datos.length > 0 && (onExportarPNG || onExportarCSV) ? (
            <div className="flex items-center gap-1.5">
              {onExportarPNG ? (
                <button
                  type="button"
                  disabled={exportandoPNG}
                  onClick={onExportarPNG}
                  title="Exportar gráfica a PNG"
                  aria-label="Exportar gráfica a PNG"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-white/75 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-45"
                >
                  <Camera size={14} />
                </button>
              ) : null}
              {onExportarCSV ? (
                <button
                  type="button"
                  onClick={onExportarCSV}
                  title="Exportar historial a CSV"
                  aria-label="Exportar historial a CSV"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-white/75 transition-colors hover:bg-white/15 hover:text-white"
                >
                  <FileSpreadsheet size={14} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {datos.length === 0 ? (
        <div className="flex min-h-64 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 text-center">
          <p className="text-sm font-medium text-white/75">Sin datos de evolución todavía</p>
          <p className="mt-1 text-xs text-white/55">
            Pulsa el botón circular de ejecución en la barra superior para iniciar el AGS.
          </p>
        </div>
      ) : (
        <div className="min-h-64 w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={[...datos]} margin={{ top: 14, right: 16, left: -10, bottom: 4 }}>
              <defs>
                <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow
                    dx="0"
                    dy="0"
                    stdDeviation="3.5"
                    floodColor="#4F8CFF"
                    floodOpacity="0.7"
                  />
                </filter>
                <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="rgba(255,255,255,0.07)"
                strokeDasharray="3 4"
                vertical={false}
              />
              <XAxis
                dataKey="generacion"
                type="number"
                domain={['dataMin', 'dataMax']}
                ticks={ticksX}
                stroke="rgba(255,255,255,0.45)"
                tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <YAxis
                domain={dominioY}
                stroke="rgba(255,255,255,0.45)"
                tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                unit=" g"
              />
              <Tooltip content={<GlassyChartTooltip />} />

              {generacionConvergencia > 0 ? (
                <ReferenceLine
                  x={generacionConvergencia}
                  stroke="#4F8CFF"
                  strokeOpacity={0.7}
                  strokeDasharray="4 4"
                  label={{
                    value: 'Convergió',
                    fill: '#9BC0FF',
                    fontSize: 12,
                    fontWeight: 600,
                    position: 'insideTopRight',
                  }}
                />
              ) : null}

              {/* Promedio: área degradada white/20 -> 0 con línea white/35 de 1.5 px */}
              <Area
                type="monotone"
                dataKey="promedioAGS"
                name="Promedio AGS"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth={1.5}
                fill={`url(#${areaGradId})`}
                dot={false}
                activeDot={{ r: 4, fill: '#ffffff' }}
                isAnimationActive={false}
              />

              {/* Aleatorio: ámbar #F5B85A punteado */}
              <Line
                type="monotone"
                dataKey="mejorAleatorio"
                name="Aleatorio"
                stroke="#F5B85A"
                strokeWidth={1.8}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4, fill: '#F5B85A', stroke: '#1a1b1f', strokeWidth: 1.5 }}
                connectNulls
                isAnimationActive={false}
              />

              {/* Mejor AGS: azul #4F8CFF con glow y animación pathLength */}
              <Line
                type="monotone"
                dataKey="mejorFactibleAGS"
                name="Mejor AGS"
                stroke="#4F8CFF"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#ffffff', stroke: '#4F8CFF', strokeWidth: 2 }}
                shape={renderLineaMejorAGS}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
