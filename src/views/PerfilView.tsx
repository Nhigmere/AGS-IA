import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Dumbbell,
  Play,
  RotateCcw,
  Scale,
  TrendingDown,
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { TermometroPesoCard } from '../components/ui/TermometroPesoCard';
import {
  calcularEvaluacionCorporal,
  LIMITES_PERFIL,
  OPCIONES_ACTIVIDAD,
  OPCIONES_OBJETIVO,
  PRESETS_DEFICIT,
  PRESETS_SUPERAVIT,
  resolverModoGasto,
  validarFormularioPerfil,
} from '../controllers/perfil';
import { useAGSController } from '../controllers/useAGSController';
import { esFormularioValido } from '../controllers/validacion';
import type {
  ModoGastoDiario,
  NivelActividad,
  ObjetivoFisico,
  PerfilUsuario,
  SexoBiologico,
} from '../models/types';
import { useAGSStore } from '../store/useAGSStore';

const ICONOS_OBJETIVO = {
  bajar: TrendingDown,
  mantener: Scale,
  ganar: Dumbbell,
} as const;

export function PerfilView() {
  const perfilStore = useAGSStore((s) => s.perfilUsuario);
  const catalogo = useAGSStore((s) => s.catalogo);
  const estadoEjecucion = useAGSStore((s) => s.estadoEjecucion);
  const controller = useAGSController();

  const [borrador, setBorrador] = useState<PerfilUsuario>(perfilStore);

  const errores = useMemo(() => validarFormularioPerfil(borrador), [borrador]);
  const formularioValido = esFormularioValido(errores);

  const perfilParaCalculo = formularioValido ? borrador : perfilStore;
  const evaluacion = useMemo(
    () => calcularEvaluacionCorporal(perfilParaCalculo),
    [perfilParaCalculo],
  );

  const caloriasTotalesCatalogo = useMemo(
    () => catalogo.reduce((acc, a) => acc + a.calorias, 0),
    [catalogo],
  );

  const actualizarCampo = <K extends keyof PerfilUsuario>(campo: K, valor: PerfilUsuario[K]) => {
    const siguiente: PerfilUsuario = { ...borrador, [campo]: valor };
    setBorrador(siguiente);
    if (esFormularioValido(validarFormularioPerfil(siguiente))) {
      controller.actualizarPerfilUsuario({ [campo]: valor });
    }
  };

  const cambiarModoGasto = (modo: ModoGastoDiario) => {
    const parche: Partial<PerfilUsuario> = {
      modoGasto: modo,
      caloriasActivasReloj:
        modo === 'reloj' ? (borrador.caloriasActivasReloj ?? 500) : borrador.caloriasActivasReloj,
      diasEntrenoSemana:
        modo === 'reloj' ? (borrador.diasEntrenoSemana ?? 5) : borrador.diasEntrenoSemana,
      caloriasDescansoReloj:
        modo === 'reloj'
          ? (borrador.caloriasDescansoReloj ?? 200)
          : borrador.caloriasDescansoReloj,
      caloriasQuemadasDia:
        modo === 'total_manual'
          ? (borrador.caloriasQuemadasDia ?? evaluacion.tdeeEstimado)
          : modo === 'actividad'
            ? null
            : borrador.caloriasQuemadasDia,
    };
    const siguiente: PerfilUsuario = { ...borrador, ...parche };
    setBorrador(siguiente);
    if (esFormularioValido(validarFormularioPerfil(siguiente))) {
      controller.actualizarPerfilUsuario(parche);
    }
  };

  const modoGastoActual = resolverModoGasto(borrador);
  const diasEntrenoActual = borrador.diasEntrenoSemana ?? 5;
  const diasDescansoActual = 7 - diasEntrenoActual;

  const restaurar = () => {
    controller.restaurarPerfilPorDefecto();
    setBorrador(useAGSStore.getState().perfilUsuario);
  };

  const aplicarYCorrer = async () => {
    if (!formularioValido) return;
    controller.actualizarPerfilUsuario(borrador);
    await controller.aplicarPerfilAlAGS(true);
  };

  const estaCorriendo = estadoEjecucion === 'ejecutando' || estadoEjecucion === 'cargando';

  return (
    <div className="space-y-4">
      {/* Encabezado limpio y directo */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">1. Configura tus datos</h2>
          <p className="text-xs text-white/55">
            Ajusta tu peso, estatura, actividad y meta. Cuando estés listo pulsa{' '}
            <strong className="text-white/80">Crear mi menú diario</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={restaurar}
          className="glass-chip flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/15 hover:text-white"
        >
          <RotateCcw size={13} />
          Restaurar ejemplo
        </button>
      </div>

      {/* Bloque principal en 2 columnas limpias y proporcionadas */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        {/* Columna izquierda: 3 pasos simples en una sola tarjeta */}
        <GlassCard hoverable={false} className="space-y-5 xl:col-span-5">
          {/* Paso A: Datos básicos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wide text-[#9BC0FF] uppercase">
                A · Sobre ti
              </span>

              <div
                role="group"
                aria-label="Sexo biológico"
                className="flex rounded-full border border-white/12 bg-black/25 p-0.5 text-xs"
              >
                {(['hombre', 'mujer'] as const).map((sexo: SexoBiologico) => {
                  const activo = borrador.sexo === sexo;
                  return (
                    <button
                      key={sexo}
                      type="button"
                      onClick={() => actualizarCampo('sexo', sexo)}
                      className={`rounded-full px-3.5 py-1 font-medium capitalize transition-colors ${
                        activo ? 'bg-[#4F8CFF] text-white' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {sexo}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Peso */}
              <div className="space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="perfil-peso" className="text-xs font-medium text-white/80">
                    Peso
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      id="perfil-peso"
                      type="number"
                      min={LIMITES_PERFIL.pesoKg.min}
                      max={LIMITES_PERFIL.pesoKg.max}
                      step={0.5}
                      value={Number.isFinite(borrador.pesoKg) ? borrador.pesoKg : ''}
                      onChange={(e) => actualizarCampo('pesoKg', Number(e.target.value))}
                      className="glass-input w-16 px-2 py-1 text-right text-xs font-semibold tabular-nums"
                    />
                    <span className="text-[11px] text-white/50">kg</span>
                  </div>
                </div>
                <input
                  type="range"
                  aria-label="Peso actual en kilogramos"
                  min={LIMITES_PERFIL.pesoKg.min}
                  max={160}
                  step={0.5}
                  value={
                    Number.isFinite(borrador.pesoKg)
                      ? Math.min(160, Math.max(LIMITES_PERFIL.pesoKg.min, borrador.pesoKg))
                      : LIMITES_PERFIL.pesoKg.min
                  }
                  onChange={(e) => actualizarCampo('pesoKg', Number(e.target.value))}
                  className="glass-slider w-full"
                />
                {errores.pesoKg ? <p className="text-[10px] text-rose-400">{errores.pesoKg}</p> : null}
              </div>

              {/* Estatura */}
              <div className="space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="perfil-estatura" className="text-xs font-medium text-white/80">
                    Estatura
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      id="perfil-estatura"
                      type="number"
                      min={LIMITES_PERFIL.estaturaCm.min}
                      max={LIMITES_PERFIL.estaturaCm.max}
                      step={1}
                      value={Number.isFinite(borrador.estaturaCm) ? borrador.estaturaCm : ''}
                      onChange={(e) => actualizarCampo('estaturaCm', Number(e.target.value))}
                      className="glass-input w-16 px-2 py-1 text-right text-xs font-semibold tabular-nums"
                    />
                    <span className="text-[11px] text-white/50">cm</span>
                  </div>
                </div>
                <input
                  type="range"
                  aria-label="Estatura en centímetros"
                  min={LIMITES_PERFIL.estaturaCm.min}
                  max={215}
                  step={1}
                  value={
                    Number.isFinite(borrador.estaturaCm)
                      ? Math.min(215, Math.max(LIMITES_PERFIL.estaturaCm.min, borrador.estaturaCm))
                      : LIMITES_PERFIL.estaturaCm.min
                  }
                  onChange={(e) => actualizarCampo('estaturaCm', Number(e.target.value))}
                  className="glass-slider w-full"
                />
                {errores.estaturaCm ? (
                  <p className="text-[10px] text-rose-400">{errores.estaturaCm}</p>
                ) : null}
              </div>

              {/* Edad */}
              <div className="space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="perfil-edad" className="text-xs font-medium text-white/80">
                    Edad
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      id="perfil-edad"
                      type="number"
                      min={LIMITES_PERFIL.edad.min}
                      max={LIMITES_PERFIL.edad.max}
                      step={1}
                      value={Number.isFinite(borrador.edad) ? borrador.edad : ''}
                      onChange={(e) => actualizarCampo('edad', Math.trunc(Number(e.target.value)))}
                      className="glass-input w-14 px-2 py-1 text-right text-xs font-semibold tabular-nums"
                    />
                    <span className="text-[11px] text-white/50">años</span>
                  </div>
                </div>
                <input
                  type="range"
                  aria-label="Edad en años"
                  min={LIMITES_PERFIL.edad.min}
                  max={85}
                  step={1}
                  value={
                    Number.isFinite(borrador.edad)
                      ? Math.min(85, Math.max(LIMITES_PERFIL.edad.min, borrador.edad))
                      : LIMITES_PERFIL.edad.min
                  }
                  onChange={(e) => actualizarCampo('edad', Math.trunc(Number(e.target.value)))}
                  className="glass-slider w-full"
                />
                {errores.edad ? <p className="text-[10px] text-rose-400">{errores.edad}</p> : null}
              </div>

              {/* Presupuesto */}
              <div className="space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="perfil-presupuesto" className="text-xs font-medium text-white/80">
                    Presupuesto
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      id="perfil-presupuesto"
                      type="number"
                      min={LIMITES_PERFIL.presupuestoDiario.min}
                      max={LIMITES_PERFIL.presupuestoDiario.max}
                      step={5}
                      value={
                        Number.isFinite(borrador.presupuestoDiario)
                          ? borrador.presupuestoDiario
                          : ''
                      }
                      onChange={(e) => actualizarCampo('presupuestoDiario', Number(e.target.value))}
                      className="glass-input w-16 px-2 py-1 text-right text-xs font-semibold tabular-nums"
                    />
                    <span className="text-[11px] text-white/50">MXN</span>
                  </div>
                </div>
                <input
                  type="range"
                  aria-label="Presupuesto diario en pesos mexicanos"
                  min={40}
                  max={400}
                  step={5}
                  value={
                    Number.isFinite(borrador.presupuestoDiario)
                      ? Math.min(400, Math.max(40, borrador.presupuestoDiario))
                      : 40
                  }
                  onChange={(e) => actualizarCampo('presupuestoDiario', Number(e.target.value))}
                  className="glass-slider w-full"
                />
                {errores.presupuestoDiario ? (
                  <p className="text-[10px] text-rose-400">{errores.presupuestoDiario}</p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Paso B: Reposo + Calorías extras (opcional) con frecuencia semanal */}
          <div className="space-y-2.5 border-t border-white/10 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wide text-[#9BC0FF] uppercase">
                B · Calorías que quemas
              </span>

              <div
                role="group"
                aria-label="Modo de calorías extras"
                className="flex rounded-full border border-white/12 bg-black/25 p-0.5 text-[11px]"
              >
                {(
                  [
                    { id: 'actividad', etiqueta: 'Estimar' },
                    { id: 'reloj', etiqueta: 'Extras (reloj)' },
                    { id: 'total_manual', etiqueta: 'Total día' },
                  ] as const
                ).map((op) => {
                  const activo = modoGastoActual === op.id;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => cambiarModoGasto(op.id)}
                      className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
                        activo ? 'bg-[#4F8CFF] text-white' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {op.etiqueta}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Línea explícita de calorías en reposo */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs tabular-nums">
              <span className="text-white/65">De por sí en reposo (automático):</span>
              <strong className="text-white">
                {evaluacion.tmb.toLocaleString('es-MX')} kcal/día
              </strong>
            </div>

            {modoGastoActual === 'actividad' ? (
              <div className="space-y-1.5">
                <label htmlFor="perfil-actividad" className="block text-[11px] text-white/60">
                  Calorías extras estimadas por tu nivel de actividad diaria:
                </label>
                <select
                  id="perfil-actividad"
                  value={borrador.nivelActividad}
                  onChange={(e) =>
                    actualizarCampo('nivelActividad', e.target.value as NivelActividad)
                  }
                  className="glass-input w-full px-3.5 py-2 text-xs text-white [&>option]:bg-neutral-800"
                >
                  {OPCIONES_ACTIVIDAD.map((op) => (
                    <option key={op.valor} value={op.valor}>
                      {op.etiqueta} — {op.descripcion}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-white/60 tabular-nums">
                  Reposo ({evaluacion.tmb.toLocaleString('es-MX')}) + Extras estimadas (
                  {evaluacion.caloriasExtrasDia.toLocaleString('es-MX')}) ={' '}
                  <strong className="text-emerald-300">
                    {evaluacion.tdee.toLocaleString('es-MX')} kcal/día
                  </strong>
                </p>
              </div>
            ) : modoGastoActual === 'reloj' ? (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                {/* Frecuencia semanal */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-white/80">
                      ¿Cuántos días a la semana entrenas?
                    </span>
                    <span className="font-mono text-[#9BC0FF]">
                      {diasEntrenoActual === 7
                        ? 'Diario (7 días)'
                        : diasEntrenoActual === 5
                          ? 'Lun–Vie (5 d entreno / 2 d descanso)'
                          : `${diasEntrenoActual} d entreno / ${diasDescansoActual} d descanso`}
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                      const activo = diasEntrenoActual === d;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => actualizarCampo('diasEntrenoSemana', d)}
                          className={`rounded-lg border py-1 text-xs font-semibold tabular-nums transition-colors ${
                            activo
                              ? 'border-[#4F8CFF]/75 bg-[#4F8CFF]/25 text-white'
                              : 'border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/12 hover:text-white'
                          }`}
                        >
                          {d}d
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Extras en días de entrenamiento */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="perfil-kcal-reloj" className="text-xs text-white/85">
                      {diasEntrenoActual === 7
                        ? 'Extras diarias (reloj · opcional)'
                        : `Extras días de entreno (${diasEntrenoActual} d · opcional)`}
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        id="perfil-kcal-reloj"
                        type="number"
                        min={LIMITES_PERFIL.caloriasActivasReloj.min}
                        max={LIMITES_PERFIL.caloriasActivasReloj.max}
                        step={25}
                        value={
                          borrador.caloriasActivasReloj !== undefined &&
                          borrador.caloriasActivasReloj !== null &&
                          Number.isFinite(borrador.caloriasActivasReloj)
                            ? borrador.caloriasActivasReloj
                            : ''
                        }
                        onChange={(e) =>
                          actualizarCampo('caloriasActivasReloj', Number(e.target.value))
                        }
                        className="glass-input w-20 px-2.5 py-1 text-right text-xs font-semibold tabular-nums"
                      />
                      <span className="text-[11px] text-white/50">kcal</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    aria-label="Calorías extras en días de entrenamiento"
                    min={0}
                    max={2000}
                    step={25}
                    value={
                      borrador.caloriasActivasReloj !== undefined &&
                      borrador.caloriasActivasReloj !== null &&
                      Number.isFinite(borrador.caloriasActivasReloj)
                        ? Math.min(2000, Math.max(0, borrador.caloriasActivasReloj))
                        : 500
                    }
                    onChange={(e) => actualizarCampo('caloriasActivasReloj', Number(e.target.value))}
                    className="glass-slider w-full"
                  />
                  {errores.caloriasActivasReloj ? (
                    <p className="text-[10px] text-rose-400">{errores.caloriasActivasReloj}</p>
                  ) : null}
                </div>

                {/* Extras en días de descanso (solo cuando entrena menos de 7 días) */}
                {diasEntrenoActual < 7 ? (
                  <div className="space-y-1.5 border-t border-white/10 pt-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="perfil-kcal-descanso" className="text-xs text-white/80">
                        Extras días de descanso ({diasDescansoActual} d · ej. Sáb–Dom)
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          id="perfil-kcal-descanso"
                          type="number"
                          min={LIMITES_PERFIL.caloriasDescansoReloj.min}
                          max={LIMITES_PERFIL.caloriasDescansoReloj.max}
                          step={25}
                          value={
                            borrador.caloriasDescansoReloj !== undefined &&
                            borrador.caloriasDescansoReloj !== null &&
                            Number.isFinite(borrador.caloriasDescansoReloj)
                              ? borrador.caloriasDescansoReloj
                              : ''
                          }
                          onChange={(e) =>
                            actualizarCampo('caloriasDescansoReloj', Number(e.target.value))
                          }
                          className="glass-input w-20 px-2.5 py-1 text-right text-xs font-semibold tabular-nums"
                        />
                        <span className="text-[11px] text-white/50">kcal</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      aria-label="Calorías extras en días de descanso"
                      min={0}
                      max={1000}
                      step={25}
                      value={
                        borrador.caloriasDescansoReloj !== undefined &&
                        borrador.caloriasDescansoReloj !== null &&
                        Number.isFinite(borrador.caloriasDescansoReloj)
                          ? Math.min(1000, Math.max(0, borrador.caloriasDescansoReloj))
                          : 200
                      }
                      onChange={(e) =>
                        actualizarCampo('caloriasDescansoReloj', Number(e.target.value))
                      }
                      className="glass-slider w-full"
                    />
                    {errores.caloriasDescansoReloj ? (
                      <p className="text-[10px] text-rose-400">{errores.caloriasDescansoReloj}</p>
                    ) : null}
                  </div>
                ) : null}

                {/* Suma total súper explícita */}
                <div className="space-y-0.5 rounded-xl border border-[#4F8CFF]/30 bg-[#4F8CFF]/10 px-3 py-2 text-[11px] text-white/85 tabular-nums">
                  <p>
                    Reposo ({evaluacion.tmb.toLocaleString('es-MX')}) + Extras prom. (
                    <strong className="text-[#9BC0FF]">
                      +{evaluacion.caloriasExtrasDia.toLocaleString('es-MX')}
                    </strong>
                    ) ={' '}
                    <strong className="text-emerald-300">
                      {evaluacion.tdee.toLocaleString('es-MX')} kcal/día
                    </strong>
                  </p>
                  {diasEntrenoActual < 7 ? (
                    <p className="text-[10px] text-white/60">
                      Día entreno: {evaluacion.caloriasDiaEntreno.toLocaleString('es-MX')} kcal ·
                      Día descanso: {evaluacion.caloriasDiaDescanso.toLocaleString('es-MX')} kcal
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="perfil-kcal-quemadas" className="text-xs text-white/80">
                    Total diario (reposo + movimiento)
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      id="perfil-kcal-quemadas"
                      type="number"
                      min={LIMITES_PERFIL.caloriasQuemadasDia.min}
                      max={LIMITES_PERFIL.caloriasQuemadasDia.max}
                      step={25}
                      value={
                        borrador.caloriasQuemadasDia !== undefined &&
                        borrador.caloriasQuemadasDia !== null &&
                        Number.isFinite(borrador.caloriasQuemadasDia)
                          ? borrador.caloriasQuemadasDia
                          : ''
                      }
                      onChange={(e) =>
                        actualizarCampo('caloriasQuemadasDia', Number(e.target.value))
                      }
                      className="glass-input w-20 px-2.5 py-1 text-right text-xs font-semibold tabular-nums"
                    />
                    <span className="text-[11px] text-white/50">kcal</span>
                  </div>
                </div>
                <input
                  type="range"
                  aria-label="Calorías totales quemadas en el día"
                  min={1200}
                  max={5000}
                  step={25}
                  value={
                    borrador.caloriasQuemadasDia !== undefined &&
                    borrador.caloriasQuemadasDia !== null &&
                    Number.isFinite(borrador.caloriasQuemadasDia)
                      ? Math.min(5000, Math.max(1200, borrador.caloriasQuemadasDia))
                      : 2000
                  }
                  onChange={(e) => actualizarCampo('caloriasQuemadasDia', Number(e.target.value))}
                  className="glass-slider w-full"
                />
                {errores.caloriasQuemadasDia ? (
                  <p className="text-[10px] text-rose-400">{errores.caloriasQuemadasDia}</p>
                ) : null}
              </div>
            )}
          </div>

          {/* Paso C: Objetivo + Peso meta + Ritmo */}
          <div className="space-y-3 border-t border-white/10 pt-4">
            <span className="block text-xs font-semibold tracking-wide text-[#9BC0FF] uppercase">
              C · Tu objetivo
            </span>

            <div className="grid grid-cols-3 gap-2">
              {OPCIONES_OBJETIVO.map((op) => {
                const activo = borrador.objetivo === op.valor;
                const Icono = ICONOS_OBJETIVO[op.valor];
                return (
                  <button
                    key={op.valor}
                    type="button"
                    onClick={() => {
                      const siguiente: PerfilUsuario = {
                        ...borrador,
                        objetivo: op.valor as ObjetivoFisico,
                        pesoMetaKg: null,
                        ajusteCaloricoPersonalizado: null,
                      };
                      setBorrador(siguiente);
                      if (esFormularioValido(validarFormularioPerfil(siguiente))) {
                        controller.actualizarPerfilUsuario({
                          objetivo: op.valor as ObjetivoFisico,
                          pesoMetaKg: null,
                          ajusteCaloricoPersonalizado: null,
                        });
                      }
                    }}
                    className={`flex flex-col items-center gap-1 rounded-2xl border px-2.5 py-2.5 text-center transition-all ${
                      activo
                        ? 'border-[#4F8CFF]/75 bg-[#4F8CFF]/22 text-white shadow-[0_0_12px_rgba(79,140,255,0.28)]'
                        : 'border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.09] hover:text-white'
                    }`}
                  >
                    <Icono size={15} className={activo ? 'text-[#9BC0FF]' : 'text-white/55'} />
                    <span className="text-xs font-semibold">{op.etiqueta}</span>
                  </button>
                );
              })}
            </div>

            {borrador.objetivo !== 'mantener' ? (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="perfil-peso-meta" className="text-xs font-medium text-white/85">
                    Peso meta
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="perfil-peso-meta"
                      type="number"
                      min={LIMITES_PERFIL.pesoKg.min}
                      max={LIMITES_PERFIL.pesoKg.max}
                      step={0.5}
                      value={
                        borrador.pesoMetaKg !== undefined && borrador.pesoMetaKg !== null
                          ? Number.isFinite(borrador.pesoMetaKg)
                            ? borrador.pesoMetaKg
                            : ''
                          : evaluacion.proyeccion.pesoMetaKg
                      }
                      onChange={(e) => {
                        const valor = e.target.value.trim();
                        actualizarCampo('pesoMetaKg', valor === '' ? null : Number(valor));
                      }}
                      className="glass-input w-20 px-2.5 py-1 text-right text-xs font-semibold tabular-nums"
                    />
                    <span className="text-[11px] text-white/50">kg</span>
                    {borrador.pesoMetaKg !== undefined && borrador.pesoMetaKg !== null ? (
                      <button
                        type="button"
                        onClick={() => actualizarCampo('pesoMetaKg', null)}
                        className="glass-chip px-2 py-0.5 text-[10px] text-[#9BC0FF] hover:bg-white/15"
                      >
                        Ideal ({evaluacion.pesoIdeal.toFixed(0)} kg)
                      </button>
                    ) : null}
                  </div>
                </div>
                {errores.pesoMetaKg ? (
                  <p className="text-[10px] text-rose-400">{errores.pesoMetaKg}</p>
                ) : null}

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-white/65">Ritmo diario</span>
                    <span className="font-mono text-[#9BC0FF] tabular-nums">
                      {evaluacion.ajusteCalorico > 0
                        ? `+${evaluacion.ajusteCalorico}`
                        : evaluacion.ajusteCalorico}{' '}
                      kcal/día
                    </span>
                  </div>
                  <div
                    className={`grid gap-1.5 ${
                      borrador.objetivo === 'bajar' ? 'grid-cols-4' : 'grid-cols-3'
                    }`}
                  >
                    {(borrador.objetivo === 'bajar' ? PRESETS_DEFICIT : PRESETS_SUPERAVIT).map(
                      (preset) => {
                        const activo = Math.abs(evaluacion.ajusteCalorico) === preset.valor;
                        return (
                          <button
                            key={preset.valor}
                            type="button"
                            onClick={() =>
                              actualizarCampo('ajusteCaloricoPersonalizado', preset.valor)
                            }
                            className={`rounded-xl border px-2 py-1.5 text-center text-[11px] font-medium transition-colors ${
                              activo
                                ? 'border-[#4F8CFF]/70 bg-[#4F8CFF]/25 text-white'
                                : 'border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/12 hover:text-white'
                            }`}
                          >
                            {preset.etiqueta}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </GlassCard>

        {/* Columna derecha: Termómetro + 1 acción clara */}
        <div className="flex flex-col gap-4 xl:col-span-7">
          <TermometroPesoCard perfil={perfilParaCalculo} evaluacion={evaluacion} />

          {evaluacion.caloriasObjetivo > caloriasTotalesCatalogo ? (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-400/35 bg-amber-500/12 px-4 py-3 text-xs text-amber-100">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-300" />
              <p>
                Tu meta ({evaluacion.caloriasObjetivo.toLocaleString('es-MX')} kcal) supera las
                calorías del catálogo actual ({Math.round(caloriasTotalesCatalogo)} kcal). Puedes
                agregar más alimentos en la pestaña <strong>Alimentos</strong>.
              </p>
            </div>
          ) : null}

          <div className="glass-card flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-sm font-semibold text-white">¿Listo para ver tu dieta?</p>
              <p className="mt-0.5 text-xs text-white/55">
                El algoritmo armará tu menú con máxima proteína dentro de tus calorías y
                presupuesto.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {evaluacion.proyeccion.diasEstimados > 0 ? (
                <button
                  type="button"
                  onClick={() => controller.cambiarVista('progreso')}
                  className="glass-chip flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-white/85 hover:bg-white/15 hover:text-white"
                >
                  <CalendarClock size={14} className="text-[#9BC0FF]" />
                  Ver progreso
                </button>
              ) : null}
              <button
                type="button"
                disabled={!formularioValido || estaCorriendo}
                onClick={() => void aplicarYCorrer()}
                className="flex items-center gap-2 rounded-full bg-[#4F8CFF] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_0_18px_rgba(79,140,255,0.5)] transition-colors hover:bg-[#3d7cf5] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Play size={14} />
                Crear mi menú diario
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
