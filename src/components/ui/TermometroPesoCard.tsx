import { useId } from 'react';
import { Activity, CheckCircle2, Flame, Scale, Wallet } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { IMC_ESCALA_MAX, IMC_ESCALA_MIN, obtenerEtiquetaObjetivo } from '../../controllers/perfil';
import type { CategoriaIMC, EvaluacionCorporal, PerfilUsuario } from '../../models/types';

export interface TermometroPesoCardProps {
  perfil: PerfilUsuario;
  evaluacion: EvaluacionCorporal;
  className?: string;
}

interface EstiloCategoria {
  readonly color: string;
  readonly bgBadge: string;
  readonly textBadge: string;
  readonly borderBadge: string;
}

const ESTILOS_CATEGORIA: Record<CategoriaIMC, EstiloCategoria> = {
  bajo_peso: {
    color: '#60A5FA',
    bgBadge: 'bg-sky-400/15',
    textBadge: 'text-sky-300',
    borderBadge: 'border-sky-400/35',
  },
  saludable: {
    color: '#34D399',
    bgBadge: 'bg-emerald-400/15',
    textBadge: 'text-emerald-300',
    borderBadge: 'border-emerald-400/35',
  },
  sobrepeso: {
    color: '#F5B85A',
    bgBadge: 'bg-amber-400/15',
    textBadge: 'text-amber-200',
    borderBadge: 'border-amber-400/35',
  },
  obesidad_1: {
    color: '#FB923C',
    bgBadge: 'bg-orange-400/15',
    textBadge: 'text-orange-200',
    borderBadge: 'border-orange-400/35',
  },
  obesidad_2_3: {
    color: '#FB7185',
    bgBadge: 'bg-rose-400/15',
    textBadge: 'text-rose-200',
    borderBadge: 'border-rose-400/35',
  },
};

const ZONAS_TERMOMETRO = [
  { min: 14, max: 18.5, color: '#60A5FA', etiqueta: 'Bajo' },
  { min: 18.5, max: 24.9, color: '#34D399', etiqueta: 'Ideal' },
  { min: 24.9, max: 30, color: '#F5B85A', etiqueta: 'Sobrepeso' },
  { min: 30, max: 35, color: '#FB923C', etiqueta: 'Obes. I' },
  { min: 35, max: 40, color: '#FB7185', etiqueta: 'Obes. II+' },
] as const;

const MARCAS_IMC = [18.5, 21.7, 24.9, 30, 35] as const;

function imcAY(imc: number, topY: number, bottomY: number): number {
  const clamped = Math.min(IMC_ESCALA_MAX, Math.max(IMC_ESCALA_MIN, imc));
  const ratio = (clamped - IMC_ESCALA_MIN) / (IMC_ESCALA_MAX - IMC_ESCALA_MIN);
  return bottomY - ratio * (bottomY - topY);
}

export function TermometroPesoCard({
  perfil,
  evaluacion,
  className = '',
}: TermometroPesoCardProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const uid = useId();
  const clipTubeId = `thermo-tube-${uid}`;
  const glowId = `thermo-glow-${uid}`;

  const estilo = ESTILOS_CATEGORIA[evaluacion.categoriaIMC];
  const alturaM = perfil.estaturaCm / 100;
  const altura2 = alturaM * alturaM;

  const tubeX = 68;
  const tubeW = 34;
  const tubeTopY = 24;
  const tubeBottomY = 278;
  const bulbCx = tubeX + tubeW / 2;
  const bulbCy = 304;
  const bulbR = 28;

  const yActual = imcAY(evaluacion.imc, tubeTopY, tubeBottomY);
  const ySaludMin = imcAY(18.5, tubeTopY, tubeBottomY);
  const ySaludMax = imcAY(24.9, tubeTopY, tubeBottomY);
  const yIdeal = imcAY(21.7, tubeTopY, tubeBottomY);
  const alturaLiquido = Math.max(6, bulbCy - yActual);

  const textoRecomendacionPeso =
    evaluacion.diferenciaKgRango === 0
      ? '¡Estás dentro de tu peso saludable!'
      : evaluacion.diferenciaKgRango < 0
        ? `Te faltan aprox. ${Math.abs(evaluacion.diferenciaKgRango).toFixed(1)} kg para llegar al rango saludable.`
        : `Estás aprox. ${evaluacion.diferenciaKgRango.toFixed(1)} kg arriba de tu rango saludable.`;

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className={`glass-card flex flex-col gap-5 p-5 sm:p-6 ${className}`}
    >
      {/* Encabezado limpio */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-white">
          <Scale size={17} className="text-[#4F8CFF]" />
          Tu peso ideal
        </h3>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${estilo.bgBadge} ${estilo.textBadge} ${estilo.borderBadge}`}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: estilo.color, boxShadow: `0 0 8px ${estilo.color}` }}
          />
          {evaluacion.etiquetaIMC} · IMC {evaluacion.imc.toFixed(1)}
        </span>
      </div>

      {/* Termómetro + Resumen sencillo */}
      <div className="grid flex-1 grid-cols-1 items-center gap-5 md:grid-cols-12">
        {/* Termómetro SVG */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-4 md:col-span-5">
          <svg
            viewBox="0 0 220 348"
            className="h-72 w-full max-w-[230px] overflow-visible select-none"
            role="img"
            aria-label={`Termómetro de IMC: actual ${evaluacion.imc.toFixed(1)} (${evaluacion.etiquetaIMC}), rango saludable de ${evaluacion.pesoMinSaludable} a ${evaluacion.pesoMaxSaludable} kg`}
          >
            <defs>
              <clipPath id={clipTubeId}>
                <rect
                  x={tubeX + 4}
                  y={tubeTopY + 4}
                  width={tubeW - 8}
                  height={tubeBottomY - tubeTopY + 12}
                  rx={13}
                />
              </clipPath>
              <filter id={glowId} x="-35%" y="-35%" width="170%" height="170%">
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="4"
                  floodColor={estilo.color}
                  floodOpacity="0.65"
                />
              </filter>
            </defs>

            {ZONAS_TERMOMETRO.map((zona) => {
              const yTop = imcAY(zona.max, tubeTopY, tubeBottomY);
              const yBot = imcAY(zona.min, tubeTopY, tubeBottomY);
              const esIdeal = zona.etiqueta === 'Ideal';
              return (
                <rect
                  key={zona.etiqueta}
                  x={tubeX - 16}
                  y={yTop + 0.5}
                  width={esIdeal ? 9 : 6}
                  height={Math.max(2, yBot - yTop - 1)}
                  rx={3}
                  fill={zona.color}
                  fillOpacity={esIdeal ? 0.9 : 0.45}
                />
              );
            })}

            <text
              x={tubeX - 24}
              y={(ySaludMin + ySaludMax) / 2 + 3}
              textAnchor="end"
              fill="#34D399"
              fontSize="10"
              fontWeight="700"
            >
              IDEAL
            </text>

            <rect
              x={tubeX}
              y={tubeTopY}
              width={tubeW}
              height={tubeBottomY - tubeTopY + 14}
              rx={17}
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={1.5}
            />

            <g clipPath={`url(#${clipTubeId})`}>
              <rect
                x={tubeX + 4}
                y={ySaludMax}
                width={tubeW - 8}
                height={Math.max(2, ySaludMin - ySaludMax)}
                fill="#34D399"
                fillOpacity={0.14}
              />

              <motion.rect
                x={tubeX + 5}
                width={tubeW - 10}
                rx={12}
                fill={estilo.color}
                fillOpacity={0.85}
                initial={false}
                animate={{ y: yActual, height: alturaLiquido }}
                transition={
                  prefersReduced
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 180, damping: 22 }
                }
              />

              <rect
                x={tubeX + 8}
                y={tubeTopY + 8}
                width={4}
                height={tubeBottomY - tubeTopY}
                rx={2}
                fill="rgba(255,255,255,0.22)"
              />
            </g>

            <circle
              cx={bulbCx}
              cy={bulbCy}
              r={bulbR}
              fill="rgba(255,255,255,0.07)"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1.5}
            />
            <motion.circle
              cx={bulbCx}
              cy={bulbCy}
              r={bulbR - 6}
              animate={{ fill: estilo.color }}
              transition={{ duration: 0.25 }}
              filter={`url(#${glowId})`}
            />
            <circle cx={bulbCx - 7} cy={bulbCy - 7} r={5} fill="rgba(255,255,255,0.35)" />
            <text
              x={bulbCx}
              y={bulbCy + 4}
              textAnchor="middle"
              fill="#111318"
              fontSize="11"
              fontWeight="800"
            >
              {evaluacion.imc.toFixed(1)}
            </text>

            <line
              x1={tubeX - 4}
              y1={yIdeal}
              x2={tubeX + tubeW + 10}
              y2={yIdeal}
              stroke="#34D399"
              strokeWidth={1.3}
              strokeDasharray="3 2"
            />

            {MARCAS_IMC.map((imcMarca) => {
              const y = imcAY(imcMarca, tubeTopY, tubeBottomY);
              const kgMarca = (imcMarca * altura2).toFixed(0);
              const esIdeal = imcMarca === 21.7;
              return (
                <g key={imcMarca}>
                  <line
                    x1={tubeX + tubeW + 2}
                    y1={y}
                    x2={tubeX + tubeW + 9}
                    y2={y}
                    stroke={esIdeal ? '#34D399' : 'rgba(255,255,255,0.35)'}
                    strokeWidth={esIdeal ? 1.5 : 1}
                  />
                  <text
                    x={tubeX + tubeW + 14}
                    y={y + 3.5}
                    fill={esIdeal ? '#6EE7B7' : 'rgba(255,255,255,0.6)'}
                    fontSize={esIdeal ? '10' : '9.5'}
                    fontWeight={esIdeal ? '700' : '500'}
                  >
                    {esIdeal ? `Ideal ~${kgMarca} kg` : `${kgMarca} kg`}
                  </text>
                </g>
              );
            })}

            <motion.g
              initial={false}
              animate={{ y: yActual }}
              transition={
                prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 22 }
              }
            >
              <line
                x1={tubeX - 6}
                y1={0}
                x2={tubeX + tubeW + 6}
                y2={0}
                stroke="#ffffff"
                strokeWidth={2}
              />
              <polygon
                points={`${tubeX - 6},0 ${tubeX - 14},-5 ${tubeX - 14},5`}
                fill="#ffffff"
              />
              <rect
                x={2}
                y={-12}
                width={48}
                height={24}
                rx={12}
                fill="#1a1b1f"
                stroke={estilo.color}
                strokeWidth={1.5}
              />
              <text
                x={26}
                y={3.5}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="10.5"
                fontWeight="700"
              >
                {perfil.pesoKg} kg
              </text>
            </motion.g>
          </svg>

          <div className="mt-1 flex flex-wrap justify-center gap-x-2.5 gap-y-1 text-[10px] text-white/55">
            {ZONAS_TERMOMETRO.map((z) => (
              <span key={z.etiqueta} className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: z.color }} />
                {z.etiqueta}
              </span>
            ))}
          </div>
        </div>

        {/* Diagnóstico sencillo (solo lo que importa entender) */}
        <div className="flex flex-col gap-3.5 md:col-span-7">
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.08] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                <CheckCircle2 size={14} />
                Rango saludable ({perfil.estaturaCm} cm)
              </span>
              <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200 tabular-nums">
                Ideal ≈ {evaluacion.pesoIdeal.toFixed(1)} kg
              </span>
            </div>
            <p className="mt-1.5 text-2xl font-bold text-white tabular-nums">
              {evaluacion.pesoMinSaludable.toFixed(1)} – {evaluacion.pesoMaxSaludable.toFixed(1)} kg
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/75">{textoRecomendacionPeso}</p>
          </div>

          {/* Desglose súper claro: Reposo + Extras (opcional) = Total -> Límite diario */}
          <div className="space-y-3 rounded-2xl border border-[#4F8CFF]/35 bg-[#4F8CFF]/10 p-4">
            <p className="text-xs font-semibold text-[#9BC0FF]">
              Tu balance diario ({obtenerEtiquetaObjetivo(perfil.objetivo)})
            </p>

            {/* Suma explícita: Reposo + Extras = Total quemado */}
            <div className="space-y-1.5 rounded-xl border border-white/10 bg-black/20 p-3 text-xs tabular-nums">
              <div className="flex items-center justify-between text-white/75">
                <span>1. Quemas de por sí en reposo (TMB)</span>
                <strong className="text-white">
                  {evaluacion.tmb.toLocaleString('es-MX')} kcal
                </strong>
              </div>
              <div className="flex items-center justify-between text-white/75">
                <span>
                  2. Extras (
                  {evaluacion.modoGastoAplicado === 'reloj'
                    ? evaluacion.diasEntrenoSemana < 7
                      ? `${evaluacion.diasEntrenoSemana}d entreno / ${7 - evaluacion.diasEntrenoSemana}d descanso`
                      : 'diario · reloj'
                    : evaluacion.modoGastoAplicado === 'total_manual'
                      ? 'según total medido'
                      : 'estimadas · opcional'}
                  )
                </span>
                <strong className="text-[#9BC0FF]">
                  +{evaluacion.caloriasExtrasDia.toLocaleString('es-MX')} kcal
                </strong>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-1.5 font-semibold text-white">
                <span>
                  = Total que quemas{' '}
                  {evaluacion.modoGastoAplicado === 'reloj' && evaluacion.diasEntrenoSemana < 7
                    ? '(promedio/día)'
                    : 'al día'}
                </span>
                <span className="text-emerald-300">
                  {evaluacion.tdee.toLocaleString('es-MX')} kcal/día
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 tabular-nums">
              <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                <p className="flex items-center gap-1 text-[11px] text-white/55">
                  <Flame size={11} className="text-[#4F8CFF]" />
                  Máximo para comer
                </p>
                <p className="mt-0.5 text-base font-bold text-[#9BC0FF]">
                  {evaluacion.caloriasObjetivo.toLocaleString('es-MX')}
                  <span className="ml-1 text-[11px] font-normal text-white/50">kcal/día</span>
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                <p className="flex items-center gap-1 text-[11px] text-white/55">
                  <Wallet size={11} className="text-emerald-300" />
                  Presupuesto diario
                </p>
                <p className="mt-0.5 text-base font-bold text-white">
                  ${perfil.presupuestoDiario}
                  <span className="ml-1 text-[11px] font-normal text-white/50">MXN</span>
                </p>
              </div>
            </div>

            <p className="text-[11px] text-white/60 tabular-nums">
              Proteína sugerida: ~{evaluacion.proteinaRecomendadaG} g/día
              {evaluacion.proyeccion.diasEstimados > 0
                ? ` · Avance estimado: ${evaluacion.proyeccion.direccion === 'bajar' ? '-' : '+'}${evaluacion.proyeccion.gramosPorDia} g/día (${evaluacion.proyeccion.tiempoDesglosado.textoCompleto})`
                : ''}
            </p>

            {evaluacion.pisoSeguroAplicado ? (
              <p className="flex items-center gap-1.5 text-[11px] text-amber-200/90">
                <Activity size={12} className="shrink-0" />
                Se aplicó el mínimo seguro de {evaluacion.caloriasObjetivo} kcal/día.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
