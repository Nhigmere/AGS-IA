import { useMemo, useRef, useState } from 'react';
import { Beef, Flame, Sparkles, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { ConvergenceChartCard } from '../components/dashboard/ConvergenceChartCard';
import { OptimalMenuCard } from '../components/dashboard/OptimalMenuCard';
import { ProteinByCategoryCard } from '../components/dashboard/ProteinByCategoryCard';
import { ChromosomeStrip } from '../components/ui/ChromosomeStrip';
import {
  ChartSkeleton,
  GaugeSkeleton,
  MenuListSkeleton,
  StatsCardSkeleton,
} from '../components/ui/GlassySkeleton';
import { RadialGaugeCard } from '../components/ui/RadialGaugeCard';
import { SlideConfirmCard } from '../components/ui/SlideConfirmCard';
import { StatsCard } from '../components/ui/StatsCard';
import {
  agruparProteinaPorCategoria,
  combinarCurvasConvergencia,
} from '../controllers/comparativa';
import { useAGSStore } from '../store/useAGSStore';
import {
  exportarCorridaCompletaJSON,
  exportarElementoAPNG,
  exportarHistorialCSV,
} from '../utils/exportacion';

type SerieKPI = 'mejor' | 'promedio' | 'aleatorio';

const SEGMENTOS_PROTEINA = [
  { valor: 'mejor' as const, etiqueta: 'Mejor' },
  { valor: 'promedio' as const, etiqueta: 'Prom.' },
  { valor: 'aleatorio' as const, etiqueta: 'Aleat.' },
];

export function ResumenView() {
  const catalogo = useAGSStore((s) => s.catalogo);
  const configuracion = useAGSStore((s) => s.configuracion);
  const estadoEjecucion = useAGSStore((s) => s.estadoEjecucion);
  const generacionActual = useAGSStore((s) => s.generacionActual);
  const historialAGS = useAGSStore((s) => s.historialAGS);
  const resultadoAGS = useAGSStore((s) => s.resultadoAGS);
  const resultadoAleatorio = useAGSStore((s) => s.resultadoAleatorio);
  const errorEjecucion = useAGSStore((s) => s.errorEjecucion);

  const [serieActiva, setSerieActiva] = useState<SerieKPI>('mejor');
  const [exportandoPNG, setExportandoPNG] = useState(false);
  const graficaRef = useRef<HTMLDivElement | null>(null);

  const { restricciones, parametros } = configuracion;
  const ultimoReporte = historialAGS.length > 0 ? historialAGS[historialAGS.length - 1] : null;
  const mejorIndividuo = resultadoAGS?.mejorIndividuo ?? null;

  const datosGrafica = useMemo(
    () => combinarCurvasConvergencia(historialAGS, resultadoAleatorio?.historial ?? []),
    [historialAGS, resultadoAleatorio],
  );

  const proteinaPorCategoria = useMemo(
    () => agruparProteinaPorCategoria(catalogo, mejorIndividuo?.cromosoma ?? null),
    [catalogo, mejorIndividuo],
  );

  const estaCargandoInicial =
    estadoEjecucion === 'cargando' ||
    (estadoEjecucion === 'ejecutando' && historialAGS.length === 0);

  const proteinaMejor = mejorIndividuo?.proteinaTotal ?? ultimoReporte?.mejorFactibleGlobal ?? 0;
  const proteinaPromedio = ultimoReporte?.aptitudPromedio ?? 0;
  const proteinaAleatorio = resultadoAleatorio?.mejorIndividuo?.proteinaTotal ?? 0;

  const valorProteinaKPI =
    serieActiva === 'mejor'
      ? proteinaMejor
      : serieActiva === 'promedio'
        ? proteinaPromedio
        : proteinaAleatorio;

  const deltaVsAleatorio =
    proteinaAleatorio > 0 ? ((proteinaMejor - proteinaAleatorio) / proteinaAleatorio) * 100 : null;

  const caloriasUsadas = mejorIndividuo?.caloriasTotales ?? 0;
  const costoUsado = mejorIndividuo?.costoTotal ?? 0;
  const generacionConvergencia = resultadoAGS?.generacionConvergencia ?? generacionActual;

  // Destello de borde único al converger (se activa una sola vez por corrida finalizada)
  const convergio = estadoEjecucion === 'finalizado' && resultadoAGS !== null;
  const corridaKey = resultadoAGS
    ? `${resultadoAGS.semilla}-${resultadoAGS.generacionesEjecutadas}-${resultadoAGS.tiempoMs}`
    : 'idle';

  const manejarExportarPNG = async () => {
    if (!graficaRef.current) return;
    setExportandoPNG(true);
    try {
      await exportarElementoAPNG(
        graficaRef.current,
        `ags-convergencia-semilla-${parametros.semilla}.png`,
      );
    } finally {
      setExportandoPNG(false);
    }
  };

  const manejarExportarCSV = () => {
    exportarHistorialCSV(historialAGS, resultadoAleatorio?.historial ?? [], parametros.semilla);
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
      }}
      className="flex flex-1 flex-col gap-4"
    >
      {errorEjecucion ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-xs text-rose-200"
        >
          {errorEjecucion}
        </div>
      ) : null}

      {estaCargandoInicial ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </div>
          <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12">
            <div className="md:col-span-3 xl:col-span-3">
              <GaugeSkeleton />
            </div>
            <div className="md:col-span-3 xl:col-span-5">
              <ChartSkeleton />
            </div>
            <div className="md:col-span-6 xl:col-span-4">
              <MenuListSkeleton />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Fila superior: 4 tarjetas KPI */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              key={`kpi-prot-${corridaKey}`}
              titulo="Proteína máxima"
              valorNumerico={valorProteinaKPI}
              sufijo="g"
              cambioTexto={
                deltaVsAleatorio !== null
                  ? `${deltaVsAleatorio >= 0 ? '+' : ''}${deltaVsAleatorio.toFixed(1)}% vs. búsqueda aleatoria`
                  : historialAGS.length > 0
                    ? 'Calculando línea base aleatoria...'
                    : 'Pulsa Ejecutar para optimizar'
              }
              positivo={deltaVsAleatorio === null || deltaVsAleatorio >= 0}
              icono={Beef}
              segmentos={SEGMENTOS_PROTEINA}
              segmentoActivo={serieActiva}
              onCambiarSegmento={setSerieActiva}
              destelloConvergencia={convergio}
            />

            <StatsCard
              key={`kpi-kcal-${corridaKey}`}
              titulo="Calorías usadas"
              valorNumerico={caloriasUsadas}
              formatearValor={(v) => Math.round(v).toLocaleString('es-MX')}
              comparacion={`/ ${restricciones.maxCalorias.toLocaleString('es-MX')} kcal`}
              cambioTexto={
                mejorIndividuo
                  ? `${((caloriasUsadas / restricciones.maxCalorias) * 100).toFixed(1)}% utilizado · Factible`
                  : 'Límite duro ≤ maxCalorias'
              }
              positivo={caloriasUsadas <= restricciones.maxCalorias}
              icono={Flame}
              destelloConvergencia={convergio}
            />

            <StatsCard
              key={`kpi-costo-${corridaKey}`}
              titulo="Costo diario"
              valorNumerico={costoUsado}
              formatearValor={(v) => `$${v.toFixed(1)}`}
              comparacion={`/ $${restricciones.presupuesto} MXN`}
              cambioTexto={
                mejorIndividuo
                  ? `$${(restricciones.presupuesto - costoUsado).toFixed(2)} bajo presupuesto`
                  : 'Límite duro ≤ presupuesto'
              }
              positivo={costoUsado <= restricciones.presupuesto}
              icono={Wallet}
              destelloConvergencia={convergio}
            />

            <StatsCard
              key={`kpi-conv-${corridaKey}`}
              titulo="Convergencia"
              valorNumerico={generacionConvergencia}
              formatearValor={(v) => `Gen ${Math.round(v)}`}
              comparacion={`/ ${parametros.maxGeneraciones}`}
              cambioTexto={
                ultimoReporte
                  ? `${ultimoReporte.porcentajeFactibles.toFixed(0)}% factibles · Div. ${ultimoReporte.diversidad.toFixed(2)}`
                  : `${(parametros.tamanoPoblacion * parametros.maxGeneraciones).toLocaleString('es-MX')} eval. máx.`
              }
              positivo
              icono={Sparkles}
              destelloConvergencia={convergio}
            />
          </div>

          {/* Bento Grid equilibrado:
              Izquierda: Gauge + Dieta factible + Cromosoma (15x2)
              Centro:    Curva de convergencia + Proteína por categoría (dona)
              Derecha:   Menú diario óptimo */}
          <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12">
            <div className="flex flex-col gap-4 md:col-span-3 xl:col-span-3">
              <RadialGaugeCard
                caloriasUsadas={caloriasUsadas}
                maxCalorias={restricciones.maxCalorias}
                costoUsado={costoUsado}
                presupuesto={restricciones.presupuesto}
                destelloConvergencia={convergio}
              />

              <SlideConfirmCard
                etiquetaBadge={mejorIndividuo?.factible ? 'DIETA FACTIBLE' : 'EXPORTAR CORRIDA'}
                cifraPrincipal={
                  mejorIndividuo
                    ? `${mejorIndividuo.proteinaTotal.toFixed(1)} g prot.`
                    : 'Sin corrida'
                }
                descripcion={
                  mejorIndividuo
                    ? `${mejorIndividuo.cantidadAlimentos} porciones · ${Math.round(mejorIndividuo.caloriasTotales)} kcal · $${mejorIndividuo.costoTotal.toFixed(2)} MXN.`
                    : 'Ejecuta el AGS para descargar el menú óptimo y su configuración reproducible.'
                }
                textoAccion="Exportar JSON"
                textoConfirmado="Descargado"
                deshabilitado={!resultadoAGS}
                destelloConvergencia={convergio}
                onConfirmar={() =>
                  exportarCorridaCompletaJSON(
                    catalogo,
                    configuracion,
                    resultadoAGS,
                    resultadoAleatorio,
                  )
                }
              />

              <ChromosomeStrip
                cromosoma={mejorIndividuo?.cromosoma ?? null}
                catalogo={catalogo}
                destelloConvergencia={convergio}
              />
            </div>

            <div className="flex flex-col gap-4 md:col-span-3 xl:col-span-5">
              <ConvergenceChartCard
                datos={datosGrafica}
                generacionConvergencia={resultadoAGS?.generacionConvergencia ?? 0}
                corridaKey={corridaKey}
                chartRef={graficaRef}
                onExportarPNG={() => void manejarExportarPNG()}
                onExportarCSV={manejarExportarCSV}
                exportandoPNG={exportandoPNG}
                destelloConvergencia={convergio}
                className="flex-1"
              />

              <ProteinByCategoryCard
                categorias={proteinaPorCategoria}
                proteinaTotal={mejorIndividuo?.proteinaTotal ?? 0}
                destelloConvergencia={convergio}
              />
            </div>

            <div className="md:col-span-6 xl:col-span-4">
              <OptimalMenuCard
                catalogo={catalogo}
                cromosoma={mejorIndividuo?.cromosoma ?? null}
                proteinaTotal={mejorIndividuo?.proteinaTotal ?? 0}
                caloriasTotales={mejorIndividuo?.caloriasTotales ?? 0}
                costoTotal={mejorIndividuo?.costoTotal ?? 0}
                factible={mejorIndividuo?.factible ?? false}
                destelloConvergencia={convergio}
                className="h-full"
              />
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
