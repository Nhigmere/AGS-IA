import { useMemo } from 'react';
import {
  ArrowRight,
  Beef,
  CalendarClock,
  Download,
  Flame,
  Play,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import { OptimalMenuCard } from '../components/dashboard/OptimalMenuCard';
import { ChromosomeStrip } from '../components/ui/ChromosomeStrip';
import {
  GaugeSkeleton,
  MenuListSkeleton,
  StatsCardSkeleton,
} from '../components/ui/GlassySkeleton';
import { RadialGaugeCard } from '../components/ui/RadialGaugeCard';
import { StatsCard } from '../components/ui/StatsCard';
import {
  calcularEvaluacionCorporal,
  calcularProyeccionConMenu,
  obtenerEtiquetaObjetivo,
} from '../controllers/perfil';
import { useAGSController } from '../controllers/useAGSController';
import { useAGSStore } from '../store/useAGSStore';
import { exportarCorridaCompletaJSON } from '../utils/exportacion';

export function ResumenView() {
  const catalogo = useAGSStore((s) => s.catalogo);
  const configuracion = useAGSStore((s) => s.configuracion);
  const estadoEjecucion = useAGSStore((s) => s.estadoEjecucion);
  const historialAGS = useAGSStore((s) => s.historialAGS);
  const resultadoAGS = useAGSStore((s) => s.resultadoAGS);
  const resultadoAleatorio = useAGSStore((s) => s.resultadoAleatorio);
  const errorEjecucion = useAGSStore((s) => s.errorEjecucion);
  const catalogoModificadoSinEjecutar = useAGSStore((s) => s.catalogoModificadoSinEjecutar);
  const perfilUsuario = useAGSStore((s) => s.perfilUsuario);
  const controller = useAGSController();

  const evaluacionPerfil = useMemo(
    () => calcularEvaluacionCorporal(perfilUsuario),
    [perfilUsuario],
  );

  const { restricciones } = configuracion;
  const ultimoReporte = historialAGS.length > 0 ? historialAGS[historialAGS.length - 1] : null;
  const mejorIndividuo = resultadoAGS?.mejorIndividuo ?? null;

  const proyeccionMenuReal = useMemo(
    () =>
      mejorIndividuo
        ? calcularProyeccionConMenu(
            evaluacionPerfil.tdee,
            mejorIndividuo.caloriasTotales,
            evaluacionPerfil.proyeccion,
            perfilUsuario.pesoKg,
            evaluacionPerfil.pesoMaxSaludable,
          )
        : null,
    [mejorIndividuo, evaluacionPerfil, perfilUsuario.pesoKg],
  );

  const estaCargandoInicial =
    estadoEjecucion === 'cargando' ||
    (estadoEjecucion === 'ejecutando' && historialAGS.length === 0);
  const estaCorriendo = estadoEjecucion === 'ejecutando' || estadoEjecucion === 'cargando';

  const proteinaMejor = mejorIndividuo?.proteinaTotal ?? ultimoReporte?.mejorFactibleGlobal ?? 0;
  const caloriasUsadas = mejorIndividuo?.caloriasTotales ?? 0;
  const costoUsado = mejorIndividuo?.costoTotal ?? 0;

  const convergio = estadoEjecucion === 'finalizado' && resultadoAGS !== null;
  const corridaKey = resultadoAGS
    ? `${resultadoAGS.semilla}-${resultadoAGS.generacionesEjecutadas}-${resultadoAGS.tiempoMs}`
    : 'idle';

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
      {/* Encabezado limpio con acciones claras */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">2. Tu menú diario</h2>
          <p className="text-xs text-white/55 tabular-nums">
            {obtenerEtiquetaObjetivo(perfilUsuario.objetivo)} · Límite{' '}
            <strong className="text-white/80">
              {restricciones.maxCalorias.toLocaleString('es-MX')} kcal
            </strong>{' '}
            · Presupuesto{' '}
            <strong className="text-white/80">${restricciones.presupuesto} MXN</strong>
            {resultadoAGS ? ` · Listo en Gen ${resultadoAGS.generacionConvergencia}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {resultadoAGS ? (
            <button
              type="button"
              onClick={() =>
                exportarCorridaCompletaJSON(
                  catalogo,
                  configuracion,
                  resultadoAGS,
                  resultadoAleatorio,
                )
              }
              className="glass-chip flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white/80 hover:bg-white/15 hover:text-white"
            >
              <Download size={14} />
              Exportar JSON
            </button>
          ) : null}

          <button
            type="button"
            disabled={estaCorriendo}
            onClick={() => void controller.ejecutar()}
            className="flex items-center gap-1.5 rounded-full bg-[#4F8CFF] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_16px_rgba(79,140,255,0.45)] transition-colors hover:bg-[#3d7cf5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play size={14} />
            {mejorIndividuo ? 'Recalcular menú' : 'Generar menú'}
          </button>
        </div>
      </div>

      {errorEjecucion ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-xs text-rose-200"
        >
          {errorEjecucion}
        </div>
      ) : null}

      {catalogoModificadoSinEjecutar && estadoEjecucion === 'inactivo' ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#4F8CFF]/45 bg-[#4F8CFF]/15 px-4 py-3 text-xs text-white">
          <div className="flex items-center gap-2.5">
            <UtensilsCrossed size={15} className="shrink-0 text-[#9BC0FF]" />
            <span>
              Cambiaste tu lista de alimentos (<strong>{catalogo.length}</strong> disponibles).
              Recalcula para actualizar tu menú.
            </span>
          </div>
          <button
            type="button"
            onClick={() => void controller.ejecutar()}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#4F8CFF] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#3d7cf5]"
          >
            <Play size={12} />
            Recalcular ahora
          </button>
        </div>
      ) : null}

      {estaCargandoInicial ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </div>
          <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-5">
              <MenuListSkeleton />
            </div>
            <div className="xl:col-span-7">
              <GaugeSkeleton />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 3 indicadores claros (sin ruido) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatsCard
              key={`kpi-prot-${corridaKey}`}
              titulo="Proteína del menú"
              valorNumerico={proteinaMejor}
              sufijo="g"
              cambioTexto={
                mejorIndividuo
                  ? `Recomendada para ti: ~${evaluacionPerfil.proteinaRecomendadaG} g/día`
                  : 'Pulsa Generar menú para calcular'
              }
              positivo={proteinaMejor >= evaluacionPerfil.proteinaRecomendadaG * 0.85}
              icono={Beef}
              destelloConvergencia={convergio}
            />

            <StatsCard
              key={`kpi-kcal-${corridaKey}`}
              titulo="Calorías del menú"
              valorNumerico={caloriasUsadas}
              formatearValor={(v) => Math.round(v).toLocaleString('es-MX')}
              comparacion={`/ ${restricciones.maxCalorias.toLocaleString('es-MX')} kcal`}
              cambioTexto={
                mejorIndividuo
                  ? `${((caloriasUsadas / restricciones.maxCalorias) * 100).toFixed(0)}% de tu límite diario`
                  : 'Dentro de tu límite diario'
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
                  ? `Te sobran $${(restricciones.presupuesto - costoUsado).toFixed(2)} MXN`
                  : 'Dentro de tu presupuesto'
              }
              positivo={costoUsado <= restricciones.presupuesto}
              icono={Wallet}
              destelloConvergencia={convergio}
            />
          </div>

          {/* 2 columnas limpias: Menú óptimo (izq) + Cromosoma y Resumen (der) */}
          <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-5">
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

            <div className="flex flex-col gap-4 xl:col-span-7">
              <ChromosomeStrip
                cromosoma={mejorIndividuo?.cromosoma ?? null}
                catalogo={catalogo}
                destelloConvergencia={convergio}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <RadialGaugeCard
                  caloriasUsadas={caloriasUsadas}
                  maxCalorias={restricciones.maxCalorias}
                  costoUsado={costoUsado}
                  presupuesto={restricciones.presupuesto}
                  destelloConvergencia={convergio}
                />

                {/* Tarjeta puente hacia Paso 3: Tu progreso */}
                <div className="glass-card flex flex-col justify-between gap-4 p-5">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                      <CalendarClock size={12} />
                      Siguiente paso
                    </span>

                    <h3 className="mt-3 text-base font-semibold text-white">
                      {proyeccionMenuReal && proyeccionMenuReal.diasEstimadosConMenu > 0
                        ? `Meta en ${proyeccionMenuReal.proyeccionCompleta.tiempoDesglosado.textoCompleto}`
                        : evaluacionPerfil.proyeccion.diasEstimados > 0
                          ? `Meta en ${evaluacionPerfil.proyeccion.tiempoDesglosado.textoCompleto}`
                          : 'Revisa tu plan de progreso'}
                    </h3>

                    <p className="mt-1 text-xs leading-relaxed text-white/60 tabular-nums">
                      {proyeccionMenuReal && proyeccionMenuReal.diasEstimadosConMenu > 0
                        ? `Siguiendo este menú (${Math.round(caloriasUsadas)} kcal) frente a lo que quemas (${evaluacionPerfil.tdee} kcal), logras un balance de ${proyeccionMenuReal.balanceDiarioKcal} kcal/día hacia tus ${evaluacionPerfil.proyeccion.pesoMetaKg} kg.`
                        : 'Consulta tu avance por día, mes y año o ajusta tu ritmo calórico en la pestaña de progreso.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => controller.cambiarVista('progreso')}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#4F8CFF] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_0_14px_rgba(79,140,255,0.4)] transition-colors hover:bg-[#3d7cf5]"
                    >
                      Ver tu progreso
                      <ArrowRight size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => controller.cambiarVista('catalogo')}
                      className="glass-chip px-3.5 py-2.5 text-xs font-medium text-white/80 hover:bg-white/15 hover:text-white"
                    >
                      Alimentos
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
