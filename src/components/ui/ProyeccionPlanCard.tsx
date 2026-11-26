import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Flame,
  Flag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Utensils,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { calcularAvanceEnDia, KCAL_POR_KG, obtenerEtiquetaObjetivo } from '../../controllers/perfil';
import type { EvaluacionCorporal, PerfilUsuario, ProyeccionObjetivo } from '../../models/types';

export interface ProyeccionPlanCardProps {
  perfil: PerfilUsuario;
  evaluacion: EvaluacionCorporal;
  /** Proyección alternativa (por ejemplo calculada con las calorías reales del menú AGS). */
  proyeccionOverride?: ProyeccionObjetivo;
  /** Calorías que consumes al día (por defecto evaluacion.caloriasObjetivo; en Resumen las del menú AGS). */
  caloriasConsumoDia?: number;
  etiquetaConsumo?: string;
  titulo?: string;
  subtitulo?: string;
  className?: string;
}

function formatearFechaFutura(dias: number): string {
  if (dias <= 0) return 'Hoy';
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ProyeccionPlanCard({
  perfil,
  evaluacion,
  proyeccionOverride,
  caloriasConsumoDia,
  etiquetaConsumo = 'Consumo planificado',
  titulo = 'Plan de progreso: inicio, propósito y avance por día, mes y año',
  subtitulo,
  className = '',
}: ProyeccionPlanCardProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const proyeccion = proyeccionOverride ?? evaluacion.proyeccion;
  const consumoDiario = Math.round(caloriasConsumoDia ?? evaluacion.caloriasObjetivo);
  const quemaDiaria = evaluacion.tdee;

  const [diaSimuladoRaw, setDiaSimuladoRaw] = useState<number>(30);
  const diaSimulado =
    proyeccion.diasEstimados > 0
      ? Math.min(proyeccion.diasEstimados, Math.max(0, diaSimuladoRaw))
      : 0;

  const avanceSimulado = useMemo(
    () =>
      calcularAvanceEnDia(
        perfil.pesoKg,
        proyeccion.pesoMetaKg,
        proyeccion.caloriasDiariasCambio,
        proyeccion.direccion,
        diaSimulado,
      ),
    [
      perfil.pesoKg,
      proyeccion.pesoMetaKg,
      proyeccion.caloriasDiariasCambio,
      proyeccion.direccion,
      diaSimulado,
    ],
  );

  const esBajar = proyeccion.direccion === 'bajar';
  const esSubir = proyeccion.direccion === 'subir';
  const tieneRuta = proyeccion.direccion !== 'mantener' && proyeccion.diasEstimados > 0;
  const signo = esBajar ? '-' : esSubir ? '+' : '';
  const fechaMeta = useMemo(
    () => formatearFechaFutura(proyeccion.diasEstimados),
    [proyeccion.diasEstimados],
  );

  const descripcionGasto =
    evaluacion.modoGastoAplicado === 'reloj'
      ? evaluacion.diasEntrenoSemana < 7
        ? `${evaluacion.tmb} reposo + ${evaluacion.caloriasExtrasDia} extras (${evaluacion.diasEntrenoSemana}d entreno / ${7 - evaluacion.diasEntrenoSemana}d descanso)`
        : `${evaluacion.tmb} reposo + ${evaluacion.caloriasExtrasDia} extras (diario)`
      : evaluacion.modoGastoAplicado === 'total_manual'
        ? `${evaluacion.tmb} reposo + ${evaluacion.caloriasExtrasDia} extras (total medido)`
        : `${evaluacion.tmb} reposo + ${evaluacion.caloriasExtrasDia} extras estimadas`;

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className={`glass-card flex flex-col gap-5 p-5 sm:p-6 ${className}`}
    >
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-white">
            <CalendarClock size={17} className="text-[#4F8CFF]" />
            {titulo}
          </h3>
          <p className="mt-0.5 text-xs text-white/55">
            {subtitulo ??
              `Proyección basada en ${KCAL_POR_KG.toLocaleString('es-MX')} kcal por kg siguiendo tu balance calórico diario.`}
          </p>
        </div>

        {tieneRuta ? (
          <div className="rounded-2xl border border-emerald-400/35 bg-emerald-500/12 px-3.5 py-2 text-right tabular-nums">
            <p className="text-[10px] font-semibold tracking-wider text-emerald-300 uppercase">
              Tiempo total estimado
            </p>
            <p className="text-sm font-bold text-white">
              {proyeccion.tiempoDesglosado.textoCompleto}
            </p>
            <p className="text-[10px] text-white/60">
              {proyeccion.diasEstimados.toLocaleString('es-MX')} días · meta aprox. {fechaMeta}
            </p>
          </div>
        ) : null}
      </div>

      {/* Franja Tu Inicio -> Cambio Total -> Tu Propósito */}
      <div className="grid grid-cols-1 items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:grid-cols-11">
        <div className="sm:col-span-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-white/55 uppercase">
            <Flag size={12} className="text-[#9BC0FF]" />
            Tu inicio (Hoy)
          </p>
          <p className="mt-1 text-xl font-bold text-white tabular-nums">
            {perfil.pesoKg.toFixed(1)} kg
          </p>
          <p className="text-[11px] text-white/55">
            IMC {evaluacion.imc.toFixed(1)} · {evaluacion.etiquetaIMC}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center text-center sm:col-span-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            {esBajar ? (
              <TrendingDown size={15} className="text-emerald-300" />
            ) : esSubir ? (
              <TrendingUp size={15} className="text-[#9BC0FF]" />
            ) : (
              <CheckCircle2 size={15} className="text-emerald-300" />
            )}
            <span className="tabular-nums">
              {proyeccion.kgPorCambiar > 0
                ? `${signo}${proyeccion.kgPorCambiar.toFixed(1)} kg (${proyeccion.caloriasTotalesObjetivo.toLocaleString('es-MX')} kcal totales)`
                : 'Mantener peso actual'}
            </span>
          </div>

          <div className="mt-2 flex w-full items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#4F8CFF]" />
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4F8CFF] to-emerald-400 transition-all"
                style={{ width: tieneRuta ? `${avanceSimulado.porcentajeAvance}%` : '100%' }}
              />
            </div>
            <ArrowRight size={14} className="text-emerald-300" />
          </div>

          {tieneRuta ? (
            <p className="mt-1.5 text-[11px] text-white/60 tabular-nums">
              {proyeccion.tiempoDesglosado.anios} año(s) · {proyeccion.tiempoDesglosado.meses}{' '}
              mes(es) · {proyeccion.tiempoDesglosado.diasRestantes} día(s)
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-3 sm:text-right">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 uppercase sm:justify-end">
            <Sparkles size={12} />
            Tu propósito
          </p>
          <p className="mt-1 text-xl font-bold text-emerald-300 tabular-nums">
            {proyeccion.pesoMetaKg.toFixed(1)} kg
          </p>
          <p className="text-[11px] text-white/55">{obtenerEtiquetaObjetivo(perfil.objetivo)}</p>
        </div>
      </div>

      {/* 4 tarjetas clave: Qué quemas, Qué consumes, Diferencia diaria y Avance al día */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/[0.07] p-3.5 tabular-nums">
          <p className="flex items-center gap-1.5 text-[11px] text-amber-200/85">
            <Flame size={13} />
            Quemas al día
          </p>
          <p className="mt-1 text-lg font-bold text-white">
            {quemaDiaria.toLocaleString('es-MX')}{' '}
            <span className="text-xs font-normal text-white/50">kcal</span>
          </p>
          <p className="mt-0.5 text-[10px] text-white/50">{descripcionGasto}</p>
        </div>

        <div className="rounded-2xl border border-[#4F8CFF]/30 bg-[#4F8CFF]/10 p-3.5 tabular-nums">
          <p className="flex items-center gap-1.5 text-[11px] text-[#9BC0FF]">
            <Utensils size={13} />
            Consumes al día
          </p>
          <p className="mt-1 text-lg font-bold text-white">
            {consumoDiario.toLocaleString('es-MX')}{' '}
            <span className="text-xs font-normal text-white/50">kcal</span>
          </p>
          <p className="mt-0.5 text-[10px] text-white/50">{etiquetaConsumo}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 tabular-nums">
          <p className="text-[11px] text-white/55">
            {esBajar ? 'Déficit diario neto' : esSubir ? 'Superávit diario' : 'Balance diario'}
          </p>
          <p className="mt-1 text-lg font-bold text-emerald-300">
            {proyeccion.caloriasDiariasCambio > 0
              ? `${esBajar ? '-' : '+'}${proyeccion.caloriasDiariasCambio.toLocaleString('es-MX')}`
              : '0'}{' '}
            <span className="text-xs font-normal text-white/50">kcal/día</span>
          </p>
          <p className="mt-0.5 text-[10px] text-white/50">
            {esBajar
              ? 'Quema neta diaria'
              : esSubir
                ? 'Excedente controlado'
                : 'Equilibrio calórico'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 tabular-nums">
          <p className="text-[11px] text-white/55">Avance estimado</p>
          <p className="mt-1 text-lg font-bold text-white">
            {proyeccion.gramosPorDia > 0 ? `${signo}${proyeccion.gramosPorDia} g` : '0 g'}
            <span className="text-xs font-normal text-white/50"> / día</span>
          </p>
          <p className="mt-0.5 text-[10px] text-white/55">
            {signo}
            {proyeccion.kgPorSemana} kg/sem · {signo}
            {proyeccion.kgPorMes} kg/mes
          </p>
        </div>
      </div>

      {/* Si no hay ruta activa (mantener o ya alcanzó meta) */}
      {!tieneRuta ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/70">
          {proyeccion.direccion === 'mantener' ? (
            <p>
              Con el objetivo <strong>Mantener peso</strong>, tu consumo diario (
              <strong>{consumoDiario.toLocaleString('es-MX')} kcal</strong>) iguala a tu gasto (
              <strong>{quemaDiaria.toLocaleString('es-MX')} kcal</strong>) para sostener tu peso
              actual en <strong>{perfil.pesoKg} kg</strong>. Selecciona{' '}
              <strong>Bajar de peso</strong> o <strong>Ganar masa muscular</strong> para ver el
              desglose día a día, mes a mes y año a año.
            </p>
          ) : proyeccion.kgPorCambiar === 0 ? (
            <p>
              Tu peso actual (<strong>{perfil.pesoKg} kg</strong>) ya alcanzó tu peso meta (
              <strong>{proyeccion.pesoMetaKg} kg</strong>). Ajusta tu peso meta si deseas proyectar
              un nuevo objetivo.
            </p>
          ) : (
            <p>
              Con este consumo diario ({consumoDiario.toLocaleString('es-MX')} kcal) frente a tu
              gasto ({quemaDiaria.toLocaleString('es-MX')} kcal) no se genera el balance necesario
              para tu objetivo. Ajusta tus calorías o nivel de actividad/reloj.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Simulador interactivo día por día */}
          <div className="space-y-3 rounded-2xl border border-[#4F8CFF]/30 bg-[#4F8CFF]/[0.08] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-white">
                Simula tu avance día por día
              </span>
              <span className="rounded-full bg-black/30 px-3 py-1 font-mono text-[11px] font-semibold text-[#9BC0FF] tabular-nums">
                Día {diaSimulado} ({avanceSimulado.tiempo.textoCompleto})
              </span>
            </div>

            <input
              type="range"
              aria-label="Simular avance por día del plan"
              min={0}
              max={proyeccion.diasEstimados}
              step={1}
              value={diaSimulado}
              onChange={(e) => setDiaSimuladoRaw(Number(e.target.value))}
              className="glass-slider w-full"
            />

            <div className="grid grid-cols-2 gap-2.5 text-xs tabular-nums sm:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
                <p className="text-[10px] text-white/50">Peso en el día {diaSimulado}</p>
                <p className="mt-0.5 text-sm font-bold text-white">
                  {avanceSimulado.pesoProyectadoKg.toFixed(2)} kg
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
                <p className="text-[10px] text-white/50">Cambio acumulado</p>
                <p className="mt-0.5 text-sm font-bold text-emerald-300">
                  {avanceSimulado.cambioAcumuladoKg > 0 ? '+' : ''}
                  {avanceSimulado.cambioAcumuladoKg.toFixed(2)} kg
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
                <p className="text-[10px] text-white/50">
                  {esBajar ? 'Calorías quemadas' : 'Superávit acumulado'}
                </p>
                <p className="mt-0.5 text-sm font-bold text-amber-200">
                  {avanceSimulado.caloriasAcumuladas.toLocaleString('es-MX')} kcal
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
                <p className="text-[10px] text-white/50">Avance hacia tu meta</p>
                <p className="mt-0.5 text-sm font-bold text-[#9BC0FF]">
                  {avanceSimulado.porcentajeAvance.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Tabla cronológica detallada: días, semanas, meses y años */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <h4 className="font-semibold text-white">
                Línea de tiempo (días · meses · años)
              </h4>
              <span className="text-[11px] text-white/50">
                Haz clic en una fila para simular ese día arriba
              </span>
            </div>

            <div className="glass-scroll overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-semibold tracking-wider text-white/45 uppercase">
                    <th className="py-2 pr-3">Etapa</th>
                    <th className="py-2 pr-3">Tiempo (años / meses / días)</th>
                    <th className="py-2 pr-3 text-right">Peso proyectado</th>
                    <th className="py-2 pr-3 text-right">Cambio</th>
                    <th className="py-2 pr-3 text-right">
                      {esBajar ? 'Kcal quemadas' : 'Kcal superávit'}
                    </th>
                    <th className="py-2 text-right">Avance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 tabular-nums">
                  {proyeccion.hitos.map((hito) => {
                    const seleccionado = diaSimulado === hito.dia;
                    return (
                      <tr
                        key={`${hito.dia}-${hito.etiqueta}`}
                        onClick={() => setDiaSimuladoRaw(hito.dia)}
                        className={`cursor-pointer transition-colors hover:bg-white/[0.06] ${
                          hito.esMetaFinal
                            ? 'bg-emerald-500/[0.10]'
                            : hito.esHitoSaludable
                              ? 'bg-[#4F8CFF]/[0.10]'
                              : seleccionado
                                ? 'bg-white/[0.07]'
                                : ''
                        }`}
                      >
                        <td className="py-2.5 pr-3 font-medium text-white">
                          <span className="inline-flex items-center gap-1.5">
                            {hito.esMetaFinal ? (
                              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34D399]" />
                            ) : hito.esHitoSaludable ? (
                              <span className="h-2 w-2 rounded-full bg-[#4F8CFF] shadow-[0_0_6px_#4F8CFF]" />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                            )}
                            {hito.etiqueta}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-white/70">
                          {hito.dia === 0
                            ? 'Día 0'
                            : `${hito.tiempo.textoCompleto} (${hito.dia} d)`}
                        </td>
                        <td className="py-2.5 pr-3 text-right font-semibold text-white">
                          {hito.pesoProyectadoKg.toFixed(1)} kg
                        </td>
                        <td
                          className={`py-2.5 pr-3 text-right font-semibold ${
                            hito.cambioAcumuladoKg === 0
                              ? 'text-white/45'
                              : esBajar
                                ? 'text-emerald-300'
                                : 'text-[#9BC0FF]'
                          }`}
                        >
                          {hito.cambioAcumuladoKg > 0 ? '+' : ''}
                          {hito.cambioAcumuladoKg.toFixed(2)} kg
                        </td>
                        <td className="py-2.5 pr-3 text-right text-amber-200/90">
                          {hito.caloriasAcumuladas.toLocaleString('es-MX')} kcal
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/12">
                              <div
                                className={`h-full rounded-full ${
                                  hito.esMetaFinal ? 'bg-emerald-400' : 'bg-[#4F8CFF]'
                                }`}
                                style={{ width: `${hito.porcentajeAvance}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-[11px] font-medium text-white/80">
                              {hito.porcentajeAvance.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
