import { useEffect, useId, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useSpring } from 'motion/react';
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';

export interface RadialGaugeCardProps {
  caloriasUsadas: number;
  maxCalorias: number;
  costoUsado: number;
  presupuesto: number;
  destelloConvergencia?: boolean;
  className?: string;
}

const TOTAL_TICKS = 60;

export function RadialGaugeCard({
  caloriasUsadas,
  maxCalorias,
  costoUsado,
  presupuesto,
  destelloConvergencia = false,
  className = '',
}: RadialGaugeCardProps) {
  const [modo, setModo] = useState<'calorias' | 'presupuesto'>('calorias');
  const prefersReduced = useReducedMotion() ?? false;
  const glowFilterId = useId();

  const porcentajeCalorias = maxCalorias > 0 ? (caloriasUsadas / maxCalorias) * 100 : 0;
  const porcentajePresupuesto = presupuesto > 0 ? (costoUsado / presupuesto) * 100 : 0;

  const esCalorias = modo === 'calorias';
  const porcentajeObjetivo = esCalorias ? porcentajeCalorias : porcentajePresupuesto;
  const porcentajeVisualObjetivo = Math.min(100, Math.max(0, porcentajeObjetivo));
  const excedeActivo = porcentajeObjetivo > 100;

  // Barrido animado del gauge con spring (motion/react)
  const springPorcentaje = useSpring(porcentajeVisualObjetivo, {
    stiffness: 95,
    damping: 18,
    mass: 0.9,
  });
  const [porcentajeBarrido, setPorcentajeBarrido] = useState(porcentajeVisualObjetivo);

  useEffect(() => {
    if (prefersReduced) {
      springPorcentaje.jump(porcentajeVisualObjetivo);
    } else {
      springPorcentaje.set(porcentajeVisualObjetivo);
    }
  }, [porcentajeVisualObjetivo, prefersReduced, springPorcentaje]);

  useMotionValueEvent(springPorcentaje, 'change', (latest) => {
    setPorcentajeBarrido(Math.min(100, Math.max(0, latest)));
  });

  const porcentajeAnimado = prefersReduced ? porcentajeVisualObjetivo : porcentajeBarrido;

  const colorArco = excedeActivo ? '#fb7185' : '#4F8CFF';
  const colorGlow = excedeActivo ? 'rgb(251 113 133 / 0.7)' : 'rgb(79 140 255 / 0.8)';

  // Posición de la perilla luminosa en el extremo del arco
  const anguloRad = ((90 - (porcentajeAnimado / 100) * 360) * Math.PI) / 180;
  const radioArco = 74;
  const perillaX = 100 + radioArco * Math.cos(anguloRad);
  const perillaY = 100 - radioArco * Math.sin(anguloRad);

  const dataGrafica = [{ name: modo, value: porcentajeAnimado, fill: colorArco }];

  // Métrica secundaria compacta
  const tituloSecundario = esCalorias ? 'Presupuesto' : 'Calorías';
  const porcentajeSecundario = esCalorias ? porcentajePresupuesto : porcentajeCalorias;
  const excedeSecundario = porcentajeSecundario > 100;
  const textoSecundario = esCalorias
    ? `$${costoUsado.toFixed(0)} / $${presupuesto.toFixed(0)} MXN`
    : `${Math.round(caloriasUsadas).toLocaleString('es-MX')} / ${Math.round(maxCalorias).toLocaleString('es-MX')} kcal`;

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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Restricciones diarias</h3>
          <p className="mt-0.5 text-xs text-white/55">
            {esCalorias ? 'Aprovechamiento calórico' : 'Aprovechamiento presupuestal'}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={!esCalorias}
          aria-label="Alternar medidor entre Calorías y Presupuesto"
          onClick={() => setModo(esCalorias ? 'presupuesto' : 'calorias')}
          className="relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-white/15 bg-[#4F8CFF] p-0.5 transition-colors"
        >
          <motion.span
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className={`h-4 w-4 rounded-full bg-white shadow-md ${
              esCalorias ? 'ml-0.5' : 'ml-auto mr-0.5'
            }`}
          />
        </button>
      </div>

      {/* Anillo radial Recharts sincronizado con spring + 60 ticks SVG + perilla luminosa */}
      <div className="relative mx-auto my-2 h-48 w-48">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="69%"
            outerRadius="80%"
            barSize={8}
            data={dataGrafica}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: 'rgba(255,255,255,0.09)' }}
              dataKey="value"
              cornerRadius={999}
              isAnimationActive={false}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        <svg
          viewBox="0 0 200 200"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor={colorGlow} />
            </filter>
          </defs>

          {Array.from({ length: TOTAL_TICKS }).map((_, idx) => {
            const angulo = (idx / TOTAL_TICKS) * 2 * Math.PI - Math.PI / 2;
            const esMayor = idx % 5 === 0;
            const r1 = esMayor ? 85 : 87;
            const r2 = 93;
            const x1 = 100 + r1 * Math.cos(angulo);
            const y1 = 100 + r1 * Math.sin(angulo);
            const x2 = 100 + r2 * Math.cos(angulo);
            const y2 = 100 + r2 * Math.sin(angulo);
            const progresoTick = (idx / TOTAL_TICKS) * 100;
            const activo = progresoTick <= porcentajeAnimado;

            return (
              <line
                key={idx}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={activo ? colorArco : 'rgba(255,255,255,0.22)'}
                strokeWidth={esMayor ? 1.5 : 1}
                strokeLinecap="round"
                opacity={activo ? 0.9 : 0.55}
              />
            );
          })}

          {porcentajeAnimado > 0.5 ? (
            <circle
              cx={perillaX}
              cy={perillaY}
              r="4.5"
              fill="#ffffff"
              stroke={colorArco}
              strokeWidth="2.5"
              filter={`url(#${glowFilterId})`}
            />
          ) : null}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline">
            <span className="text-4xl font-semibold tracking-tight text-white tabular-nums">
              {Math.round(porcentajeObjetivo)}
            </span>
            <span className="ml-0.5 text-lg font-medium text-white/55">%</span>
          </div>
          <span className="mt-1 text-xs font-semibold tracking-[0.14em] text-white/55 uppercase">
            {esCalorias ? 'CALORÍAS' : 'PRESUPUESTO'}
          </span>
          <span
            className={`mt-0.5 text-xs font-medium tabular-nums ${
              excedeActivo ? 'text-rose-300' : 'text-white/65'
            }`}
          >
            {esCalorias
              ? `${Math.round(caloriasUsadas).toLocaleString('es-MX')} / ${Math.round(maxCalorias).toLocaleString('es-MX')}`
              : `$${costoUsado.toFixed(1)} / $${presupuesto.toFixed(0)}`}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setModo(esCalorias ? 'presupuesto' : 'calorias')}
        className="mt-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.1]"
      >
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-white/65">{tituloSecundario}</span>
          <span
            className={`font-semibold tabular-nums ${
              excedeSecundario ? 'text-rose-300' : 'text-white'
            }`}
          >
            {Math.round(porcentajeSecundario)}%
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/12">
          <motion.div
            initial={false}
            animate={{ width: `${Math.min(100, Math.max(0, porcentajeSecundario))}%` }}
            transition={
              prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 20 }
            }
            className={`h-full rounded-full ${excedeSecundario ? 'bg-rose-400' : 'bg-[#4F8CFF]'}`}
          />
        </div>
        <p className="mt-1.5 text-xs text-white/55 tabular-nums">{textoSecundario}</p>
      </button>
    </motion.div>
  );
}
