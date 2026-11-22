import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Play,
  RotateCcw,
  Square,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { GlassCard } from '../components/ui/GlassCard';
import { ChartSkeleton, TableSkeleton } from '../components/ui/GlassySkeleton';
import { useAGSController } from '../controllers/useAGSController';
import { useAGSStore } from '../store/useAGSStore';
import { exportarComparativaCSV, exportarElementoAPNG } from '../utils/exportacion';

export function ComparativaView() {
  const catalogo = useAGSStore((s) => s.catalogo);
  const restricciones = useAGSStore((s) => s.configuracion.restricciones);
  const comparativaCargando = useAGSStore((s) => s.comparativaCargando);
  const comparativaProgreso = useAGSStore((s) => s.comparativaProgreso);
  const resultadoComparativa = useAGSStore((s) => s.resultadoComparativa);
  const dietaHumana = useAGSStore((s) => s.dietaHumana);

  const controller = useAGSController();
  const [cantidadCorridas, setCantidadCorridas] = useState(10);
  const [busquedaHumano, setBusquedaHumano] = useState('');
  const [segundosVivo, setSegundosVivo] = useState(0);
  const graficaRef = useRef<HTMLDivElement | null>(null);

  // Cronómetro en vivo para el modo Selección Humana
  useEffect(() => {
    if (!dietaHumana.enCurso || dietaHumana.inicioTimestampMs === null) {
      return;
    }
    const inicio = dietaHumana.inicioTimestampMs;
    const id = window.setInterval(() => {
      setSegundosVivo(Number(((Date.now() - inicio) / 1000).toFixed(1)));
    }, 200);
    return () => window.clearInterval(id);
  }, [dietaHumana.enCurso, dietaHumana.inicioTimestampMs]);

  const tiempoHumanoMostrado = dietaHumana.enCurso ? segundosVivo : dietaHumana.tiempoSegundos;

  const alimentosFiltradosHumano = useMemo(() => {
    const q = busquedaHumano.trim().toLowerCase();
    if (!q) return catalogo;
    return catalogo.filter(
      (a) => a.nombre.toLowerCase().includes(q) || a.categoria.toLowerCase().includes(q),
    );
  }, [catalogo, busquedaHumano]);

  const { evaluacion } = dietaHumana;
  const porcentajeProgreso = comparativaProgreso
    ? Math.round((comparativaProgreso.completadas / comparativaProgreso.total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Comparativa: AGS vs. Aleatorio vs. Selección Humana
          </h2>
          <p className="text-xs text-white/55">
            Igualdad estricta de presupuesto de evaluaciones entre AGS y búsqueda aleatoria, más
            desafío cronometrado contra selección manual.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="glass-chip flex items-center gap-2 px-3 py-1.5 text-xs text-white/75">
            <span>Corridas (R):</span>
            <input
              type="number"
              min={2}
              max={30}
              value={cantidadCorridas}
              disabled={comparativaCargando}
              onChange={(e) =>
                setCantidadCorridas(Math.max(2, Math.min(30, Number(e.target.value) || 2)))
              }
              className="w-12 bg-transparent text-right font-semibold text-white tabular-nums focus:outline-none"
            />
          </label>

          {!comparativaCargando ? (
            <button
              type="button"
              onClick={() => void controller.ejecutarComparativa(cantidadCorridas)}
              className="flex items-center gap-1.5 rounded-full bg-[#4F8CFF] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_16px_rgba(79,140,255,0.45)] hover:bg-[#3d7cf5]"
            >
              <Play size={14} />
              Ejecutar {cantidadCorridas} corridas
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void controller.cancelarComparativa()}
              className="flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/30"
            >
              <Square size={13} />
              Cancelar ({comparativaProgreso?.completadas ?? 0}/{comparativaProgreso?.total ?? 0})
            </button>
          )}
        </div>
      </div>

      {/* Barra de progreso multi-corrida */}
      {comparativaCargando && comparativaProgreso ? (
        <GlassCard hoverable={false} padding="sm">
          <div className="flex items-center justify-between text-xs text-white/75">
            <span>
              Ejecutando par AGS + Aleatorio en Web Worker ({comparativaProgreso.completadas} de{' '}
              {comparativaProgreso.total})...
            </span>
            <span className="font-semibold tabular-nums">{porcentajeProgreso}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/12">
            <div
              className="h-full rounded-full bg-[#4F8CFF] shadow-[0_0_10px_#4F8CFF] transition-all duration-200"
              style={{ width: `${porcentajeProgreso}%` }}
            />
          </div>
        </GlassCard>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Panel izquierdo: Modo Selección Humana */}
        <GlassCard hoverable={false} className="flex flex-col space-y-4 xl:col-span-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <UserCheck size={16} className="text-[#4F8CFF]" />
                Modo Selección Humana
              </h3>
              <p className="mt-0.5 text-xs text-white/50">
                Arma manualmente la dieta con máxima proteína sin exceder calorías ni presupuesto.
              </p>
            </div>
            <div className="glass-chip flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white tabular-nums">
              <Clock size={13} className="text-[#4F8CFF]" />
              {tiempoHumanoMostrado.toFixed(1)} s
            </div>
          </div>

          {/* Medidores en vivo kcal y presupuesto (se ponen en rosa al excederse) */}
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/15 p-3 text-xs tabular-nums">
            <div>
              <p className="text-[10px] text-white/45">Proteína</p>
              <p className="text-base font-bold text-[#9BC0FF]">
                {evaluacion.proteinaTotal.toFixed(1)} g
              </p>
            </div>
            <div>
              <p className="text-[10px] text-white/45">Calorías</p>
              <p
                className={`text-base font-bold ${
                  evaluacion.excedeCalorias ? 'text-rose-400' : 'text-white'
                }`}
              >
                {Math.round(evaluacion.caloriasTotales)}
                <span className="text-[10px] font-normal text-white/45">
                  /{restricciones.maxCalorias}
                </span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-white/45">Costo</p>
              <p
                className={`text-base font-bold ${
                  evaluacion.excedePresupuesto ? 'text-rose-400' : 'text-white'
                }`}
              >
                ${evaluacion.costoTotal.toFixed(1)}
                <span className="text-[10px] font-normal text-white/45">
                  /${restricciones.presupuesto}
                </span>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <div className="mb-1 flex justify-between text-[11px]">
                <span className="text-white/60">Calorías</span>
                <span
                  className={
                    evaluacion.excedeCalorias ? 'font-semibold text-rose-400' : 'text-white/75'
                  }
                >
                  {evaluacion.porcentajeCalorias.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/12">
                <div
                  className={`h-full rounded-full transition-all ${
                    evaluacion.excedeCalorias ? 'bg-rose-400' : 'bg-[#4F8CFF]'
                  }`}
                  style={{ width: `${Math.min(100, evaluacion.porcentajeCalorias)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-[11px]">
                <span className="text-white/60">Presupuesto</span>
                <span
                  className={
                    evaluacion.excedePresupuesto ? 'font-semibold text-rose-400' : 'text-white/75'
                  }
                >
                  {evaluacion.porcentajePresupuesto.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/12">
                <div
                  className={`h-full rounded-full transition-all ${
                    evaluacion.excedePresupuesto ? 'bg-rose-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, evaluacion.porcentajePresupuesto)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={busquedaHumano}
              onChange={(e) => setBusquedaHumano(e.target.value)}
              placeholder="Filtrar alimentos..."
              aria-label="Filtrar alimentos en modo humano"
              className="glass-input flex-1 px-3.5 py-1.5 text-xs"
            />
            {dietaHumana.enCurso ? (
              <button
                type="button"
                onClick={controller.finalizarModoHumano}
                className="rounded-full bg-emerald-500/80 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Registrar tiempo
              </button>
            ) : (
              <button
                type="button"
                onClick={controller.iniciarModoHumano}
                className="rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/25"
              >
                {dietaHumana.finalizada ? 'Intentar de nuevo' : 'Iniciar cronómetro'}
              </button>
            )}
            <button
              type="button"
              onClick={controller.reiniciarModoHumano}
              aria-label="Reiniciar selección humana"
              className="glass-chip p-1.5 text-white/70 hover:bg-white/15 hover:text-white"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <div className="glass-scroll max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {alimentosFiltradosHumano.map((item) => {
              const marcado = dietaHumana.idsSeleccionados.includes(item.id);
              return (
                <label
                  key={item.id}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-xs transition-colors ${
                    marcado
                      ? 'border-[#4F8CFF]/55 bg-[#4F8CFF]/20 text-white'
                      : 'border-white/8 bg-white/[0.04] text-white/75 hover:bg-white/[0.09]'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => controller.alternarAlimentoHumano(item.id)}
                      className="accent-[#4F8CFF]"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{item.nombre}</p>
                      <p className="text-[10px] text-white/45">{item.porcion}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="font-semibold text-[#9BC0FF]">{item.proteina.toFixed(1)} g</p>
                    <p className="text-[10px] text-white/50">
                      {item.calorias} kcal · ${item.costo}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </GlassCard>

        {/* Panel derecho: Tabla comparativa de 3 métodos + Gráfica superpuesta */}
        <div className="space-y-4 xl:col-span-7">
          {comparativaCargando ? (
            <>
              <TableSkeleton filas={4} columnas={6} />
              <ChartSkeleton />
            </>
          ) : (
            <>
              <GlassCard hoverable={false}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Resultados por método (media ± desviación)
                    </h3>
                    <p className="text-xs text-white/50">
                      {resultadoComparativa
                        ? `${resultadoComparativa.cantidadCorridas} corridas · ${resultadoComparativa.estadisticasAGS.evaluacionesPorCorrida.toLocaleString('es-MX')} evaluaciones/corrida`
                        : 'Ejecuta R corridas para poblar las métricas de AGS y búsqueda aleatoria'}
                    </p>
                  </div>

                  {resultadoComparativa ? (
                    <button
                      type="button"
                      onClick={() => exportarComparativaCSV(resultadoComparativa, dietaHumana)}
                      className="glass-chip flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/15"
                    >
                      <FileSpreadsheet size={13} />
                      CSV
                    </button>
                  ) : null}
                </div>

                <div className="glass-scroll overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-[11px] text-white/45 uppercase">
                        <th className="py-2.5 pr-3">Método</th>
                        <th className="py-2.5 pr-3 text-right">Proteína (g)</th>
                        <th className="py-2.5 pr-3 text-right">Calorías</th>
                        <th className="py-2.5 pr-3 text-right">Costo</th>
                        <th className="py-2.5 pr-3 text-center">Factible</th>
                        <th className="py-2.5 pr-3 text-right">Hallazgo</th>
                        <th className="py-2.5 text-right">Tiempo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 tabular-nums">
                      {/* Fila AGS */}
                      <tr className="bg-[#4F8CFF]/[0.08]">
                        <td className="py-3 pr-3 font-semibold text-white">AGS (Evolutivo)</td>
                        <td className="py-3 pr-3 text-right font-semibold text-[#9BC0FF]">
                          {resultadoComparativa
                            ? `${resultadoComparativa.estadisticasAGS.proteinaMedia.toFixed(1)} ± ${resultadoComparativa.estadisticasAGS.proteinaDesviacion.toFixed(1)}`
                            : '—'}
                        </td>
                        <td className="py-3 pr-3 text-right text-white/80">
                          {resultadoComparativa
                            ? `${Math.round(resultadoComparativa.estadisticasAGS.caloriasMedias)} kcal`
                            : '—'}
                        </td>
                        <td className="py-3 pr-3 text-right text-white/80">
                          {resultadoComparativa
                            ? `$${resultadoComparativa.estadisticasAGS.costoMedio.toFixed(1)}`
                            : '—'}
                        </td>
                        <td className="py-3 pr-3 text-center">
                          {resultadoComparativa ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <CheckCircle2 size={13} />
                              {resultadoComparativa.estadisticasAGS.porcentajeFactibles}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 pr-3 text-right text-white/75">
                          {resultadoComparativa
                            ? `Gen ${resultadoComparativa.estadisticasAGS.generacionOBloqueMedio}`
                            : '—'}
                        </td>
                        <td className="py-3 text-right font-medium text-emerald-400">
                          {resultadoComparativa
                            ? `${resultadoComparativa.estadisticasAGS.tiempoMedioMs.toFixed(1)} ms`
                            : '—'}
                        </td>
                      </tr>

                      {/* Fila Aleatorio */}
                      <tr>
                        <td className="py-3 pr-3 font-medium text-white/85">Búsqueda Aleatoria</td>
                        <td className="py-3 pr-3 text-right text-white/85">
                          {resultadoComparativa
                            ? `${resultadoComparativa.estadisticasAleatorio.proteinaMedia.toFixed(1)} ± ${resultadoComparativa.estadisticasAleatorio.proteinaDesviacion.toFixed(1)}`
                            : '—'}
                        </td>
                        <td className="py-3 pr-3 text-right text-white/70">
                          {resultadoComparativa
                            ? `${Math.round(resultadoComparativa.estadisticasAleatorio.caloriasMedias)} kcal`
                            : '—'}
                        </td>
                        <td className="py-3 pr-3 text-right text-white/70">
                          {resultadoComparativa
                            ? `$${resultadoComparativa.estadisticasAleatorio.costoMedio.toFixed(1)}`
                            : '—'}
                        </td>
                        <td className="py-3 pr-3 text-center">
                          {resultadoComparativa ? (
                            <span className="text-white/80">
                              {resultadoComparativa.estadisticasAleatorio.porcentajeFactibles}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 pr-3 text-right text-white/65">
                          {resultadoComparativa
                            ? `Bloque ${resultadoComparativa.estadisticasAleatorio.generacionOBloqueMedio}`
                            : '—'}
                        </td>
                        <td className="py-3 text-right text-white/75">
                          {resultadoComparativa
                            ? `${resultadoComparativa.estadisticasAleatorio.tiempoMedioMs.toFixed(1)} ms`
                            : '—'}
                        </td>
                      </tr>

                      {/* Fila Humano */}
                      <tr>
                        <td className="py-3 pr-3 font-medium text-white/85">Selección Humana</td>
                        <td className="py-3 pr-3 text-right font-semibold text-white">
                          {evaluacion.cantidadAlimentos > 0
                            ? `${evaluacion.proteinaTotal.toFixed(1)} g`
                            : '—'}
                        </td>
                        <td
                          className={`py-3 pr-3 text-right ${
                            evaluacion.excedeCalorias ? 'text-rose-400' : 'text-white/70'
                          }`}
                        >
                          {evaluacion.cantidadAlimentos > 0
                            ? `${Math.round(evaluacion.caloriasTotales)} kcal`
                            : '—'}
                        </td>
                        <td
                          className={`py-3 pr-3 text-right ${
                            evaluacion.excedePresupuesto ? 'text-rose-400' : 'text-white/70'
                          }`}
                        >
                          {evaluacion.cantidadAlimentos > 0
                            ? `$${evaluacion.costoTotal.toFixed(1)}`
                            : '—'}
                        </td>
                        <td className="py-3 pr-3 text-center">
                          {evaluacion.cantidadAlimentos > 0 ? (
                            evaluacion.factible ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400">
                                <CheckCircle2 size={13} /> Sí
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-400">
                                <XCircle size={13} /> No
                              </span>
                            )
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 pr-3 text-right text-white/65">
                          {evaluacion.cantidadAlimentos > 0
                            ? `${evaluacion.cantidadAlimentos} ítems`
                            : '—'}
                        </td>
                        <td className="py-3 text-right text-amber-300">
                          {tiempoHumanoMostrado > 0 ? `${tiempoHumanoMostrado.toFixed(1)} s` : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </GlassCard>

              {/* Gráfica superpuesta */}
              <div ref={graficaRef} className="glass-card p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Curva promedio superpuesta ({resultadoComparativa?.cantidadCorridas ?? 0}{' '}
                      corridas)
                    </h3>
                    <p className="text-xs text-white/55">
                      AGS (azul) vs. Búsqueda Aleatoria (ámbar punteada) vs. referencia Humana
                      (esmeralda)
                    </p>
                  </div>
                  {resultadoComparativa ? (
                    <button
                      type="button"
                      onClick={() =>
                        graficaRef.current &&
                        void exportarElementoAPNG(
                          graficaRef.current,
                          `ags-comparativa-${resultadoComparativa.cantidadCorridas}-corridas.png`,
                        )
                      }
                      className="glass-chip flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/15"
                    >
                      <Camera size={13} />
                      PNG
                    </button>
                  ) : null}
                </div>

                {resultadoComparativa ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[...resultadoComparativa.curvaPromedio]}
                        margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
                      >
                        <CartesianGrid
                          stroke="rgba(255,255,255,0.08)"
                          strokeDasharray="3 4"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="paso"
                          stroke="rgba(255,255,255,0.4)"
                          tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="rgba(255,255,255,0.4)"
                          tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          unit=" g"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(23,23,23,0.92)',
                            borderColor: 'rgba(255,255,255,0.15)',
                            borderRadius: '1rem',
                            fontSize: '12px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="proteinaMediaAGS"
                          name="AGS (media)"
                          stroke="#4F8CFF"
                          strokeWidth={2.5}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="proteinaMediaAleatorio"
                          name="Aleatorio (media)"
                          stroke="#F5B85A"
                          strokeWidth={1.8}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                        {evaluacion.cantidadAlimentos > 0 && evaluacion.factible ? (
                          <ReferenceLine
                            y={evaluacion.proteinaTotal}
                            stroke="#34d399"
                            strokeDasharray="4 4"
                            label={{
                              value: `Humano (${evaluacion.proteinaTotal.toFixed(1)} g)`,
                              fill: '#34d399',
                              fontSize: 11,
                              position: 'insideTopRight',
                            }}
                          />
                        ) : null}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/[0.03] text-center">
                    <p className="text-sm font-medium text-white/70">
                      Presiona &ldquo;Ejecutar {cantidadCorridas} corridas&rdquo; para comparar
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      Mientras tanto puedes armar tu dieta manual en el panel izquierdo.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
