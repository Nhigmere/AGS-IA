import { useMemo, useState } from 'react';
import { AlertTriangle, Flame, Play, SlidersHorizontal, User } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { ProyeccionPlanCard } from '../components/ui/ProyeccionPlanCard';
import {
  calcularEvaluacionCorporal,
  calcularProyeccionConMenu,
  LIMITES_PERFIL,
  PRESETS_DEFICIT,
  PRESETS_SUPERAVIT,
} from '../controllers/perfil';
import { useAGSController } from '../controllers/useAGSController';
import { useAGSStore } from '../store/useAGSStore';

type FuenteConsumo = 'plan' | 'menu_ags';

export function ProgresoView() {
  const perfil = useAGSStore((s) => s.perfilUsuario);
  const resultadoAGS = useAGSStore((s) => s.resultadoAGS);
  const estadoEjecucion = useAGSStore((s) => s.estadoEjecucion);
  const controller = useAGSController();

  const mejorIndividuo = resultadoAGS?.mejorIndividuo ?? null;
  const [fuenteConsumo, setFuenteConsumo] = useState<FuenteConsumo>(
    mejorIndividuo ? 'menu_ags' : 'plan',
  );

  const evaluacion = useMemo(() => calcularEvaluacionCorporal(perfil), [perfil]);

  const proyeccionMenuReal = useMemo(
    () =>
      mejorIndividuo
        ? calcularProyeccionConMenu(
            evaluacion.tdee,
            mejorIndividuo.caloriasTotales,
            evaluacion.proyeccion,
            perfil.pesoKg,
            evaluacion.pesoMaxSaludable,
          )
        : null,
    [mejorIndividuo, evaluacion, perfil.pesoKg],
  );

  const usandoMenuAGS = fuenteConsumo === 'menu_ags' && mejorIndividuo !== null;
  const estaCorriendo = estadoEjecucion === 'ejecutando' || estadoEjecucion === 'cargando';

  const esBajar = perfil.objetivo === 'bajar';
  const esGanar = perfil.objetivo === 'ganar';
  const ajusteActualMag =
    perfil.ajusteCaloricoPersonalizado !== undefined && perfil.ajusteCaloricoPersonalizado !== null
      ? Math.round(Math.abs(perfil.ajusteCaloricoPersonalizado))
      : esBajar
        ? 400
        : esGanar
          ? 300
          : 0;

  const rangoAjuste = esGanar ? LIMITES_PERFIL.superavitDiario : LIMITES_PERFIL.deficitDiario;
  const presets = esBajar ? PRESETS_DEFICIT : PRESETS_SUPERAVIT;

  const cambiarAjuste = (magnitud: number) => {
    const acotado = Math.min(rangoAjuste.max, Math.max(rangoAjuste.min, Math.round(magnitud)));
    controller.actualizarPerfilUsuario({ ajusteCaloricoPersonalizado: acotado });
    setFuenteConsumo('plan');
  };

  const aplicarYRegenerarMenu = async () => {
    await controller.aplicarPerfilAlAGS(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">3. Tu progreso</h2>
          <p className="text-xs text-white/55">
            Ajusta tu ritmo para ver al instante en cuántos días, meses y años llegas a tu meta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => controller.cambiarVista('perfil')}
            className="glass-chip flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white/80 hover:bg-white/15 hover:text-white"
          >
            <User size={14} />
            1. Editar datos
          </button>
          <button
            type="button"
            disabled={estaCorriendo}
            onClick={() => void aplicarYRegenerarMenu()}
            className="flex items-center gap-1.5 rounded-full bg-[#4F8CFF] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_16px_rgba(79,140,255,0.45)] transition-colors hover:bg-[#3d7cf5] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Play size={14} />
            Recalcular menú con este ritmo
          </button>
        </div>
      </div>

      {/* Control de ritmo / déficit diario para acelerar o suavizar el tiempo */}
      {perfil.objetivo !== 'mantener' ? (
        <GlassCard hoverable={false} className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <SlidersHorizontal size={15} className="text-[#4F8CFF]" />
                {esBajar
                  ? 'Ritmo para bajar de peso (déficit calórico diario)'
                  : 'Ritmo para ganar masa muscular (superávit diario)'}
              </h3>
              <p className="mt-0.5 text-xs text-white/55">
                {esBajar
                  ? 'Al consumir menos calorías al día aumenta tu déficit y se reducen los días para lograr tu meta.'
                  : 'Ajusta cuántas calorías extra consumes al día por encima de tu gasto diario.'}
              </p>
            </div>

            {mejorIndividuo ? (
              <div
                role="group"
                aria-label="Fuente de consumo calórico"
                className="flex rounded-full border border-white/12 bg-black/25 p-0.5 text-[11px]"
              >
                <button
                  type="button"
                  onClick={() => setFuenteConsumo('plan')}
                  className={`rounded-full px-3 py-1 font-medium transition-colors ${
                    !usandoMenuAGS
                      ? 'bg-[#4F8CFF] text-white shadow-[0_0_8px_rgba(79,140,255,0.4)]'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Consumo planificado ({evaluacion.caloriasObjetivo} kcal)
                </button>
                <button
                  type="button"
                  onClick={() => setFuenteConsumo('menu_ags')}
                  className={`rounded-full px-3 py-1 font-medium transition-colors ${
                    usandoMenuAGS
                      ? 'bg-emerald-500 text-white shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Menú actual AGS ({Math.round(mejorIndividuo.caloriasTotales)} kcal)
                </button>
              </div>
            ) : null}
          </div>

          {/* Botones de ritmo predefinido */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {presets.map((preset) => {
              const activo = ajusteActualMag === preset.valor && !usandoMenuAGS;
              return (
                <button
                  key={preset.valor}
                  type="button"
                  onClick={() => cambiarAjuste(preset.valor)}
                  className={`flex flex-col items-start rounded-2xl border px-3.5 py-2.5 text-left transition-all ${
                    activo
                      ? 'border-[#4F8CFF]/70 bg-[#4F8CFF]/20 text-white shadow-[0_0_12px_rgba(79,140,255,0.28)]'
                      : 'border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.09] hover:text-white'
                  }`}
                >
                  <span className="text-xs font-semibold text-white">{preset.etiqueta}</span>
                  <span className="mt-0.5 text-[10px] text-white/60 tabular-nums">
                    {preset.descripcion}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Slider fino del déficit / superávit */}
          <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
              <span className="flex items-center gap-1.5 text-white/75">
                <Flame size={13} className="text-amber-300" />
                {esBajar ? 'Déficit personalizado:' : 'Superávit personalizado:'}{' '}
                <strong className="text-white">
                  {esBajar ? '-' : '+'}
                  {ajusteActualMag} kcal/día
                </strong>
              </span>
              <span className="text-white/70">
                Consumo diario objetivo:{' '}
                <strong className="text-[#9BC0FF]">
                  {evaluacion.caloriasObjetivo.toLocaleString('es-MX')} kcal/día
                </strong>{' '}
                (gasto {evaluacion.tdee.toLocaleString('es-MX')} kcal)
              </span>
            </div>

            <input
              type="range"
              aria-label="Ajuste calórico diario personalizado"
              min={rangoAjuste.min}
              max={rangoAjuste.max}
              step={25}
              value={ajusteActualMag}
              onChange={(e) => cambiarAjuste(Number(e.target.value))}
              className="glass-slider w-full"
            />

            {evaluacion.pisoSeguroAplicado ? (
              <p className="flex items-center gap-1.5 text-[11px] text-amber-200">
                <AlertTriangle size={13} className="shrink-0" />
                Se activó el piso calórico mínimo seguro ({evaluacion.caloriasObjetivo} kcal/día)
                para proteger tu salud; para acelerar más sin bajar la comida, aumenta tus calorías
                activas con ejercicio/reloj.
              </p>
            ) : evaluacion.alertaDeficitAgresivo ? (
              <p className="flex items-center gap-1.5 text-[11px] text-amber-200">
                <AlertTriangle size={13} className="shrink-0" />
                Déficit exigente (&gt; 750 kcal/día): prioriza alta proteína para cuidar masa
                muscular y considera consultar a un especialista antes de sostenerlo.
              </p>
            ) : null}
          </div>
        </GlassCard>
      ) : null}

      {/* Tarjeta principal de línea de tiempo y simulador día por día */}
      <ProyeccionPlanCard
        perfil={perfil}
        evaluacion={evaluacion}
        proyeccionOverride={usandoMenuAGS ? proyeccionMenuReal?.proyeccionCompleta : undefined}
        caloriasConsumoDia={
          usandoMenuAGS && mejorIndividuo
            ? mejorIndividuo.caloriasTotales
            : evaluacion.caloriasObjetivo
        }
        etiquetaConsumo={usandoMenuAGS ? 'Menú óptimo AGS' : 'Consumo diario del plan'}
        titulo={
          usandoMenuAGS
            ? 'Tu progreso siguiendo el menú óptimo actual del AGS'
            : 'Tu plan de progreso: inicio, propósito y avance por día, mes y año'
        }
        subtitulo={
          usandoMenuAGS
            ? 'Calculado con las calorías exactas que consume tu menú actual del AGS frente a las calorías que quemas al día.'
            : 'Mueve el ritmo arriba o el simulador día por día para ver cómo evolucionará tu peso.'
        }
      />
    </div>
  );
}
