import { useMemo, useRef, useState } from 'react';
import { Camera, FileSpreadsheet, FlaskConical, Play, Square } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { GlassCard } from '../components/ui/GlassCard';
import { HeatmapSkeleton, TableSkeleton } from '../components/ui/GlassySkeleton';
import { useAGSController } from '../controllers/useAGSController';
import { useAGSStore } from '../store/useAGSStore';
import { exportarElementoAPNG, exportarExperimentosCSV } from '../utils/exportacion';

const OPCIONES_PC = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
const OPCIONES_PM = [0.005, 0.01, 0.02, 0.03, 0.05, 0.08];
const COLORES_SERIES = ['#4F8CFF', '#34d399', '#fbbf24', '#f472b6'];

function claveCelda(pc: number, pm: number): string {
  return `${pc}-${pm}`;
}

export function ExperimentosView() {
  const experimentosCargando = useAGSStore((s) => s.experimentosCargando);
  const experimentosProgreso = useAGSStore((s) => s.experimentosProgreso);
  const resultadoExperimentos = useAGSStore((s) => s.resultadoExperimentos);
  const controller = useAGSController();

  const [valoresPc, setValoresPc] = useState<number[]>([0.6, 0.7, 0.8, 0.9]);
  const [valoresPm, setValoresPm] = useState<number[]>([0.01, 0.02, 0.03, 0.05]);
  const [corridasPorCombinacion, setCorridasPorCombinacion] = useState(5);
  const [clavesSeleccionadas, setClavesSeleccionadas] = useState<string[]>([]);

  const heatmapRef = useRef<HTMLDivElement | null>(null);
  const curvasRef = useRef<HTMLDivElement | null>(null);

  const alternarValor = (lista: number[], valor: number, setter: (v: number[]) => void) => {
    if (lista.includes(valor)) {
      if (lista.length <= 1) return;
      setter(lista.filter((x) => x !== valor));
    } else {
      setter([...lista, valor].sort((a, b) => a - b));
    }
  };

  const totalCorridas = valoresPc.length * valoresPm.length * corridasPorCombinacion;
  const porcentajeProgreso = experimentosProgreso
    ? Math.round((experimentosProgreso.completadas / experimentosProgreso.total) * 100)
    : 0;

  const ejecutarBarrido = () => {
    setClavesSeleccionadas([]);
    void controller.ejecutarExperimentos({
      valoresPc,
      valoresPm,
      corridasPorCombinacion,
    });
  };

  const { minMedia, maxMedia } = useMemo(() => {
    if (!resultadoExperimentos || resultadoExperimentos.celdas.length === 0) {
      return { minMedia: 0, maxMedia: 1 };
    }
    const medias = resultadoExperimentos.celdas.map((c) => c.proteinaMedia);
    return { minMedia: Math.min(...medias), maxMedia: Math.max(...medias) };
  }, [resultadoExperimentos]);

  const celdasParaCurvas = useMemo(() => {
    if (!resultadoExperimentos || resultadoExperimentos.celdas.length === 0) return [];
    if (clavesSeleccionadas.length > 0) {
      return resultadoExperimentos.celdas.filter((c) =>
        clavesSeleccionadas.includes(claveCelda(c.pc, c.pm)),
      );
    }
    // Por defecto mostrar las 3 mejores combinaciones por proteína media
    return [...resultadoExperimentos.celdas]
      .sort((a, b) => b.proteinaMedia - a.proteinaMedia)
      .slice(0, 3);
  }, [resultadoExperimentos, clavesSeleccionadas]);

  const datosCurvasSuperpuestas = useMemo(() => {
    if (celdasParaCurvas.length === 0) return [];
    const maxLen = celdasParaCurvas.reduce((m, c) => Math.max(m, c.curvaPromedio.length), 0);
    const puntos: Record<string, number>[] = [];

    for (let i = 0; i < maxLen; i++) {
      const fila: Record<string, number> = { generacion: i + 1 };
      for (const celda of celdasParaCurvas) {
        const punto = celda.curvaPromedio[Math.min(i, celda.curvaPromedio.length - 1)];
        fila[claveCelda(celda.pc, celda.pm)] = punto?.proteinaMedia ?? 0;
      }
      puntos.push(fila);
    }
    return puntos;
  }, [celdasParaCurvas]);

  const alternarSeleccionCelda = (clave: string) => {
    setClavesSeleccionadas((prev) => {
      if (prev.includes(clave)) return prev.filter((k) => k !== clave);
      if (prev.length >= 4) return [...prev.slice(1), clave];
      return [...prev, clave];
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Experimentos: Impacto de Cruce (Pc) y Mutación (Pm)
          </h2>
          <p className="text-xs text-white/55">
            Objetivo específico 3: barrido factorial en Web Worker con heatmap de proteína media y
            curvas superpuestas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!experimentosCargando ? (
            <button
              type="button"
              onClick={ejecutarBarrido}
              className="flex items-center gap-1.5 rounded-full bg-[#4F8CFF] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_16px_rgba(79,140,255,0.45)] hover:bg-[#3d7cf5]"
            >
              <Play size={14} />
              Ejecutar barrido ({totalCorridas} corridas)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void controller.cancelarExperimentos()}
              className="flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/30"
            >
              <Square size={13} />
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Configuración del barrido */}
      <GlassCard hoverable={false} className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <p className="mb-2 text-xs font-semibold text-white">Valores de Cruce (Pc)</p>
          <div className="flex flex-wrap gap-1.5">
            {OPCIONES_PC.map((pc) => {
              const activo = valoresPc.includes(pc);
              return (
                <button
                  key={pc}
                  type="button"
                  disabled={experimentosCargando}
                  onClick={() => alternarValor(valoresPc, pc, setValoresPc)}
                  className={`rounded-full px-3 py-1 text-xs font-medium tabular-nums transition-colors ${
                    activo
                      ? 'border border-[#4F8CFF]/60 bg-[#4F8CFF]/25 text-white'
                      : 'border border-white/10 bg-white/[0.06] text-white/55 hover:bg-white/12'
                  }`}
                >
                  {pc.toFixed(1)}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-white">Valores de Mutación (Pm)</p>
          <div className="flex flex-wrap gap-1.5">
            {OPCIONES_PM.map((pm) => {
              const activo = valoresPm.includes(pm);
              return (
                <button
                  key={pm}
                  type="button"
                  disabled={experimentosCargando}
                  onClick={() => alternarValor(valoresPm, pm, setValoresPm)}
                  className={`rounded-full px-3 py-1 text-xs font-medium tabular-nums transition-colors ${
                    activo
                      ? 'border border-[#4F8CFF]/60 bg-[#4F8CFF]/25 text-white'
                      : 'border border-white/10 bg-white/[0.06] text-white/55 hover:bg-white/12'
                  }`}
                >
                  {pm}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col justify-between">
          <p className="mb-2 text-xs font-semibold text-white">Corridas por combinación (R)</p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={15}
              value={corridasPorCombinacion}
              disabled={experimentosCargando}
              onChange={(e) => setCorridasPorCombinacion(Number(e.target.value))}
              className="glass-slider flex-1"
            />
            <span className="glass-chip px-3 py-1 text-xs font-semibold text-white tabular-nums">
              R = {corridasPorCombinacion}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-white/45">
            {valoresPc.length} × {valoresPm.length} combinaciones = {totalCorridas} ejecuciones
          </p>
        </div>
      </GlassCard>

      {/* Barra de progreso en vivo */}
      {experimentosCargando && experimentosProgreso ? (
        <GlassCard hoverable={false} padding="sm">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/80">
            <span>
              Evaluando Pc = {experimentosProgreso.pcActual} · Pm = {experimentosProgreso.pmActual}{' '}
              ({experimentosProgreso.completadas}/{experimentosProgreso.total})
            </span>
            <span className="font-semibold tabular-nums">{porcentajeProgreso}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/12">
            <div
              className="h-full rounded-full bg-[#4F8CFF] shadow-[0_0_10px_#4F8CFF] transition-all duration-150"
              style={{ width: `${porcentajeProgreso}%` }}
            />
          </div>
        </GlassCard>
      ) : null}

      {experimentosCargando ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-6">
            <HeatmapSkeleton filas={valoresPc.length} columnas={valoresPm.length} />
          </div>
          <div className="xl:col-span-6">
            <TableSkeleton filas={6} columnas={5} />
          </div>
        </div>
      ) : resultadoExperimentos ? (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            {/* Heatmap interactivo */}
            <div ref={heatmapRef} className="glass-card p-5 sm:p-6 xl:col-span-6">
              <div className="mb-4 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Mapa de calor: Proteína media (g)
                  </h3>
                  <p className="text-xs text-white/50">
                    Haz clic hasta en 4 celdas para comparar sus curvas de convergencia.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    heatmapRef.current &&
                    void exportarElementoAPNG(
                      heatmapRef.current,
                      `ags-heatmap-pc-pm-semilla-${resultadoExperimentos.semillaBase}.png`,
                    )
                  }
                  className="glass-chip flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/15"
                >
                  <Camera size={13} />
                  PNG
                </button>
              </div>

              <div className="glass-scroll overflow-x-auto">
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `72px repeat(${resultadoExperimentos.configuracion.valoresPm.length}, minmax(76px, 1fr))`,
                  }}
                >
                  <div className="flex items-center justify-center text-[10px] font-semibold text-white/45 uppercase">
                    Pc \ Pm
                  </div>
                  {resultadoExperimentos.configuracion.valoresPm.map((pm) => (
                    <div
                      key={pm}
                      className="text-center text-xs font-semibold text-white/75 tabular-nums"
                    >
                      {pm}
                    </div>
                  ))}

                  {resultadoExperimentos.configuracion.valoresPc.map((pc) => (
                    <div key={pc} className="contents">
                      <div className="flex items-center justify-center text-xs font-semibold text-white/75 tabular-nums">
                        {pc.toFixed(1)}
                      </div>
                      {resultadoExperimentos.configuracion.valoresPm.map((pm) => {
                        const celda = resultadoExperimentos.celdas.find(
                          (c) => c.pc === pc && c.pm === pm,
                        );
                        if (!celda) {
                          return (
                            <div
                              key={claveCelda(pc, pm)}
                              className="flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-xs text-white/35"
                            >
                              —
                            </div>
                          );
                        }
                        const ratio =
                          maxMedia > minMedia
                            ? (celda.proteinaMedia - minMedia) / (maxMedia - minMedia)
                            : 1;
                        const alpha = (0.12 + ratio * 0.48).toFixed(2);
                        const clave = claveCelda(pc, pm);
                        const seleccionada = clavesSeleccionadas.includes(clave);

                        return (
                          <button
                            key={clave}
                            type="button"
                            onClick={() => alternarSeleccionCelda(clave)}
                            style={{ backgroundColor: `rgba(79, 140, 255, ${alpha})` }}
                            className={`flex h-16 flex-col items-center justify-center rounded-2xl border px-1 text-center transition-transform hover:scale-[1.03] ${
                              seleccionada ? 'border-white ring-2 ring-white/60' : 'border-white/15'
                            }`}
                          >
                            <span className="text-sm font-bold text-white tabular-nums">
                              {celda.proteinaMedia.toFixed(1)} g
                            </span>
                            <span className="text-[10px] text-white/75 tabular-nums">
                              ±{celda.proteinaDesviacion.toFixed(1)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Curvas superpuestas de combinaciones elegidas */}
            <div ref={curvasRef} className="glass-card p-5 sm:p-6 xl:col-span-6">
              <div className="mb-4 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Curvas de convergencia superpuestas
                  </h3>
                  <p className="text-xs text-white/50">
                    {clavesSeleccionadas.length > 0
                      ? `Mostrando ${celdasParaCurvas.length} combinaciones seleccionadas`
                      : 'Mostrando las 3 mejores combinaciones por proteína media'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    curvasRef.current &&
                    void exportarElementoAPNG(
                      curvasRef.current,
                      `ags-experimentos-curvas-semilla-${resultadoExperimentos.semillaBase}.png`,
                    )
                  }
                  className="glass-chip flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/15"
                >
                  <Camera size={13} />
                  PNG
                </button>
              </div>

              <div className="mb-2 flex flex-wrap gap-2 text-[11px]">
                {celdasParaCurvas.map((c, idx) => (
                  <span
                    key={claveCelda(c.pc, c.pm)}
                    className="glass-chip flex items-center gap-1.5 px-2.5 py-0.5 text-white/85 tabular-nums"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: COLORES_SERIES[idx % COLORES_SERIES.length] }}
                    />
                    Pc={c.pc} · Pm={c.pm}
                  </span>
                ))}
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={datosCurvasSuperpuestas}
                    margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
                  >
                    <CartesianGrid
                      stroke="rgba(255,255,255,0.08)"
                      strokeDasharray="3 4"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="generacion"
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
                    {celdasParaCurvas.map((c, idx) => (
                      <Line
                        key={claveCelda(c.pc, c.pm)}
                        type="monotone"
                        dataKey={claveCelda(c.pc, c.pm)}
                        name={`Pc=${c.pc}, Pm=${c.pm}`}
                        stroke={COLORES_SERIES[idx % COLORES_SERIES.length]}
                        strokeWidth={2.2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tabla resumen de combinaciones */}
          <GlassCard hoverable={false}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Tabla estadística por combinación Pc × Pm
                </h3>
                <p className="text-xs text-white/50">
                  Tiempo total del barrido:{' '}
                  {(resultadoExperimentos.tiempoTotalMs / 1000).toFixed(2)} s · Semilla base #
                  {resultadoExperimentos.semillaBase}
                </p>
              </div>
              <button
                type="button"
                onClick={() => exportarExperimentosCSV(resultadoExperimentos)}
                className="glass-chip flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/15"
              >
                <FileSpreadsheet size={13} />
                Exportar CSV
              </button>
            </div>

            <div className="glass-scroll overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] text-white/45 uppercase">
                    <th className="py-2.5 pr-3">Pc</th>
                    <th className="py-2.5 pr-3">Pm</th>
                    <th className="py-2.5 pr-3 text-right">Proteína media ± σ</th>
                    <th className="py-2.5 pr-3 text-right">Mejor (g)</th>
                    <th className="py-2.5 pr-3 text-right">% Factibles</th>
                    <th className="py-2.5 pr-3 text-right">Gen. convergencia</th>
                    <th className="py-2.5 text-right">Tiempo medio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 tabular-nums">
                  {[...resultadoExperimentos.celdas]
                    .sort((a, b) => b.proteinaMedia - a.proteinaMedia)
                    .map((c) => (
                      <tr key={claveCelda(c.pc, c.pm)} className="hover:bg-white/[0.05]">
                        <td className="py-2.5 pr-3 font-semibold text-white">{c.pc.toFixed(1)}</td>
                        <td className="py-2.5 pr-3 font-semibold text-white">{c.pm}</td>
                        <td className="py-2.5 pr-3 text-right font-semibold text-[#9BC0FF]">
                          {c.proteinaMedia.toFixed(2)} ± {c.proteinaDesviacion.toFixed(2)} g
                        </td>
                        <td className="py-2.5 pr-3 text-right text-white/80">
                          {c.mejorProteina.toFixed(1)} g
                        </td>
                        <td className="py-2.5 pr-3 text-right text-emerald-400">
                          {c.porcentajeFactibles.toFixed(1)}%
                        </td>
                        <td className="py-2.5 pr-3 text-right text-white/75">
                          Gen {c.generacionConvergenciaMedia.toFixed(1)}
                        </td>
                        <td className="py-2.5 text-right text-white/65">
                          {c.tiempoMedioMs.toFixed(1)} ms
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      ) : (
        <GlassCard
          hoverable={false}
          className="flex min-h-[16rem] flex-col items-center justify-center text-center"
        >
          <FlaskConical size={28} className="text-[#4F8CFF]" />
          <h3 className="mt-3 text-base font-semibold text-white">
            Listo para ejecutar el barrido factorial Pc × Pm
          </h3>
          <p className="mt-1 max-w-md text-xs text-white/55">
            Selecciona los valores de cruce y mutación que deseas evaluar y presiona{' '}
            <strong>Ejecutar barrido</strong>. Todo el cómputo se ejecutará en el Web Worker sin
            bloquear la interfaz.
          </p>
        </GlassCard>
      )}
    </div>
  );
}
