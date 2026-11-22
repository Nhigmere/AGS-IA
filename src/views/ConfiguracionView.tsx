import { useMemo, useState } from 'react';
import { BookOpen, Dices, Play, RotateCcw, Sparkles } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { useAGSController } from '../controllers/useAGSController';
import {
  calcularPmRecomendada,
  esFormularioValido,
  LIMITES_PARAMETROS,
  validarFormularioConfiguracion,
} from '../controllers/validacion';
import type { ConfiguracionEjecucion } from '../models/types';
import { useAGSStore } from '../store/useAGSStore';

interface CampoSliderProps {
  id: string;
  etiqueta: string;
  descripcion: string;
  valor: number;
  min: number;
  max: number;
  step: number;
  unidad?: string;
  error?: string;
  onChange: (valor: number) => void;
}

function CampoSlider({
  id,
  etiqueta,
  descripcion,
  valor,
  min,
  max,
  step,
  unidad,
  error,
  onChange,
}: CampoSliderProps) {
  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label htmlFor={id} className="text-xs font-semibold text-white">
            {etiqueta}
          </label>
          <p className="mt-0.5 text-[11px] text-white/50">{descripcion}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            id={id}
            type="number"
            value={Number.isFinite(valor) ? valor : ''}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
            className="glass-input w-24 px-3 py-1.5 text-right text-xs font-semibold tabular-nums"
          />
          {unidad ? <span className="text-[11px] text-white/45">{unidad}</span> : null}
        </div>
      </div>

      <input
        type="range"
        aria-label={etiqueta}
        value={Number.isFinite(valor) ? Math.min(max, Math.max(min, valor)) : min}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="glass-slider w-full"
      />

      {error ? (
        <p role="alert" className="text-[11px] font-medium text-rose-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ConfiguracionView() {
  const configuracionStore = useAGSStore((s) => s.configuracion);
  const cantidadAlimentos = useAGSStore((s) => s.catalogo.length);
  const controller = useAGSController();

  const [borrador, setBorrador] = useState<ConfiguracionEjecucion>(configuracionStore);
  const [mensajeGuardado, setMensajeGuardado] = useState<string | null>(null);

  const errores = useMemo(() => validarFormularioConfiguracion(borrador), [borrador]);
  const valido = esFormularioValido(errores);

  const pmRecomendada = calcularPmRecomendada(Math.max(1, cantidadAlimentos));

  const actualizarRestriccion = (
    campo: keyof ConfiguracionEjecucion['restricciones'],
    valor: number,
  ) => {
    const siguiente: ConfiguracionEjecucion = {
      ...borrador,
      restricciones: { ...borrador.restricciones, [campo]: valor },
    };
    setBorrador(siguiente);
    setMensajeGuardado(null);
    if (esFormularioValido(validarFormularioConfiguracion(siguiente))) {
      controller.actualizarRestricciones({ [campo]: valor });
    }
  };

  const actualizarParametro = (
    campo: keyof ConfiguracionEjecucion['parametros'],
    valor: number,
  ) => {
    const siguiente: ConfiguracionEjecucion = {
      ...borrador,
      parametros: { ...borrador.parametros, [campo]: valor },
    };
    setBorrador(siguiente);
    setMensajeGuardado(null);
    if (esFormularioValido(validarFormularioConfiguracion(siguiente))) {
      controller.actualizarParametros({ [campo]: valor });
    }
  };

  const restaurarDefecto = () => {
    controller.restaurarConfiguracionPorDefecto();
    const fresca = useAGSStore.getState().configuracion;
    setBorrador(fresca);
    setMensajeGuardado('Valores por defecto restaurados.');
  };

  const nuevaSemilla = () => {
    controller.generarNuevaSemilla();
    const fresca = useAGSStore.getState().configuracion;
    setBorrador(fresca);
  };

  const guardarYEjecutar = () => {
    if (!valido) return;
    controller.actualizarRestricciones(borrador.restricciones);
    controller.actualizarParametros(borrador.parametros);
    controller.cambiarVista('resumen');
    void controller.ejecutar();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Configuración del AGS</h2>
          <p className="text-xs text-white/55">
            Ajusta restricciones dietéticas, operadores evolutivos y criterio de paro. Los cambios
            válidos se persisten automáticamente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={controller.abrirModalModelo}
            className="glass-chip flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white/80 hover:bg-white/15 hover:text-white"
          >
            <BookOpen size={14} />
            Acerca del modelo (KaTeX)
          </button>
          <button
            type="button"
            onClick={restaurarDefecto}
            className="glass-chip flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white/80 hover:bg-white/15 hover:text-white"
          >
            <RotateCcw size={14} />
            Restaurar valores por defecto
          </button>
          <button
            type="button"
            disabled={!valido}
            onClick={guardarYEjecutar}
            className="flex items-center gap-1.5 rounded-full bg-[#4F8CFF] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_16px_rgba(79,140,255,0.45)] transition-colors hover:bg-[#3d7cf5] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Play size={14} />
            Ejecutar con estos parámetros
          </button>
        </div>
      </div>

      {mensajeGuardado ? (
        <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/15 px-4 py-2 text-xs text-emerald-300">
          {mensajeGuardado}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Columna izquierda: Restricciones y Reproducibilidad */}
        <div className="space-y-4 lg:col-span-5">
          <GlassCard hoverable={false}>
            <h3 className="mb-3 text-sm font-semibold text-white">Restricciones duras de dieta</h3>
            <div className="space-y-3">
              <CampoSlider
                id="cfg-max-calorias"
                etiqueta="Límite máximo de calorías"
                descripcion="Cota superior diaria (default 2,000 kcal)"
                valor={borrador.restricciones.maxCalorias}
                min={LIMITES_PARAMETROS.maxCalorias.min}
                max={LIMITES_PARAMETROS.maxCalorias.max}
                step={50}
                unidad="kcal"
                error={errores.maxCalorias}
                onChange={(v) => actualizarRestriccion('maxCalorias', v)}
              />
              <CampoSlider
                id="cfg-presupuesto"
                etiqueta="Presupuesto máximo diario"
                descripcion="Gasto máximo permitido en MXN (default $150)"
                valor={borrador.restricciones.presupuesto}
                min={LIMITES_PARAMETROS.presupuesto.min}
                max={LIMITES_PARAMETROS.presupuesto.max}
                step={5}
                unidad="MXN"
                error={errores.presupuesto}
                onChange={(v) => actualizarRestriccion('presupuesto', v)}
              />
            </div>
          </GlassCard>

          <GlassCard hoverable={false}>
            <h3 className="mb-3 text-sm font-semibold text-white">
              Paro por estancamiento y reproducibilidad
            </h3>
            <div className="space-y-3">
              <CampoSlider
                id="cfg-estancamiento"
                etiqueta="Estancamiento (% de generaciones)"
                descripcion="0 % desactiva el paro anticipado (default 25 %)"
                valor={borrador.parametros.porcentajeEstancamiento}
                min={LIMITES_PARAMETROS.porcentajeEstancamiento.min}
                max={LIMITES_PARAMETROS.porcentajeEstancamiento.max}
                step={5}
                unidad="%"
                error={errores.porcentajeEstancamiento}
                onChange={(v) => actualizarParametro('porcentajeEstancamiento', v)}
              />
              <CampoSlider
                id="cfg-epsilon"
                etiqueta="Umbral mínimo de mejora (ε)"
                descripcion="Mejora mínima en proteína para reiniciar contador (default 0.01 g)"
                valor={borrador.parametros.epsilonEstancamiento}
                min={LIMITES_PARAMETROS.epsilonEstancamiento.min}
                max={1}
                step={0.01}
                unidad="g"
                error={errores.epsilonEstancamiento}
                onChange={(v) => actualizarParametro('epsilonEstancamiento', v)}
              />

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <label htmlFor="cfg-semilla" className="text-xs font-semibold text-white">
                      Semilla pseudoaleatoria (Mulberry32)
                    </label>
                    <p className="mt-0.5 text-[11px] text-white/50">
                      Misma semilla + misma configuración = resultado idéntico
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="cfg-semilla"
                      type="number"
                      min={0}
                      step={1}
                      value={borrador.parametros.semilla}
                      onChange={(e) => actualizarParametro('semilla', Number(e.target.value))}
                      className="glass-input w-24 px-3 py-1.5 text-right text-xs font-semibold tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={nuevaSemilla}
                      title="Generar semilla aleatoria"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                    >
                      <Dices size={14} />
                    </button>
                  </div>
                </div>
                {errores.semilla ? (
                  <p role="alert" className="mt-2 text-[11px] font-medium text-rose-400">
                    {errores.semilla}
                  </p>
                ) : null}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Columna derecha: Operadores evolutivos */}
        <div className="lg:col-span-7">
          <GlassCard hoverable={false} className="h-full">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">Parámetros y operadores del AGS</h3>
              <button
                type="button"
                onClick={() => actualizarParametro('probabilidadMutacion', pmRecomendada)}
                className="glass-chip flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-[#9BC0FF] hover:bg-white/15"
              >
                <Sparkles size={12} />
                Aplicar Pm = 1/{cantidadAlimentos} ({pmRecomendada})
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CampoSlider
                id="cfg-poblacion"
                etiqueta="Tamaño de población (P)"
                descripcion="Rango 10–500 (default 50)"
                valor={borrador.parametros.tamanoPoblacion}
                min={LIMITES_PARAMETROS.tamanoPoblacion.min}
                max={LIMITES_PARAMETROS.tamanoPoblacion.max}
                step={5}
                error={errores.tamanoPoblacion}
                onChange={(v) => actualizarParametro('tamanoPoblacion', v)}
              />

              <CampoSlider
                id="cfg-generaciones"
                etiqueta="Máximo de generaciones (G)"
                descripcion="Rango 10–2,000 (default 100)"
                valor={borrador.parametros.maxGeneraciones}
                min={LIMITES_PARAMETROS.maxGeneraciones.min}
                max={LIMITES_PARAMETROS.maxGeneraciones.max}
                step={10}
                error={errores.maxGeneraciones}
                onChange={(v) => actualizarParametro('maxGeneraciones', v)}
              />

              <CampoSlider
                id="cfg-pc"
                etiqueta="Probabilidad de cruce (Pc)"
                descripcion="Cruce de un punto (default 0.80)"
                valor={borrador.parametros.probabilidadCruce}
                min={LIMITES_PARAMETROS.probabilidadCruce.min}
                max={LIMITES_PARAMETROS.probabilidadCruce.max}
                step={0.05}
                error={errores.probabilidadCruce}
                onChange={(v) => actualizarParametro('probabilidadCruce', v)}
              />

              <CampoSlider
                id="cfg-pm"
                etiqueta="Probabilidad de mutación (Pm)"
                descripcion="Bit-flip por gen, rango 0.001–0.10"
                valor={borrador.parametros.probabilidadMutacion}
                min={LIMITES_PARAMETROS.probabilidadMutacion.min}
                max={LIMITES_PARAMETROS.probabilidadMutacion.max}
                step={0.001}
                error={errores.probabilidadMutacion}
                onChange={(v) => actualizarParametro('probabilidadMutacion', v)}
              />

              <CampoSlider
                id="cfg-torneo"
                etiqueta="Tamaño de torneo (k)"
                descripcion="Competidores por selección (default 3)"
                valor={borrador.parametros.tamanoTorneo}
                min={LIMITES_PARAMETROS.tamanoTorneo.min}
                max={Math.min(
                  LIMITES_PARAMETROS.tamanoTorneo.max,
                  borrador.parametros.tamanoPoblacion,
                )}
                step={1}
                error={errores.tamanoTorneo}
                onChange={(v) => actualizarParametro('tamanoTorneo', v)}
              />

              <CampoSlider
                id="cfg-elitismo"
                etiqueta="Elitismo (e)"
                descripcion="0 = AGS canónico del anteproyecto"
                valor={borrador.parametros.cantidadElitismo}
                min={LIMITES_PARAMETROS.cantidadElitismo.min}
                max={Math.min(
                  LIMITES_PARAMETROS.cantidadElitismo.max,
                  Math.max(0, borrador.parametros.tamanoPoblacion - 1),
                )}
                step={1}
                error={errores.cantidadElitismo}
                onChange={(v) => actualizarParametro('cantidadElitismo', v)}
              />

              <CampoSlider
                id="cfg-pinicial"
                etiqueta="Probabilidad inicial (p_inicial)"
                descripcion="Sesgo inicial de genes = 1 (default 0.20)"
                valor={borrador.parametros.probabilidadInicial}
                min={LIMITES_PARAMETROS.probabilidadInicial.min}
                max={LIMITES_PARAMETROS.probabilidadInicial.max}
                step={0.05}
                error={errores.probabilidadInicial}
                onChange={(v) => actualizarParametro('probabilidadInicial', v)}
              />

              <CampoSlider
                id="cfg-penalizacion"
                etiqueta="Factor de penalización (α)"
                descripcion="Penalización estática infactibles (default 0.001)"
                valor={borrador.parametros.factorPenalizacion}
                min={LIMITES_PARAMETROS.factorPenalizacion.min}
                max={0.1}
                step={0.001}
                error={errores.factorPenalizacion}
                onChange={(v) => actualizarParametro('factorPenalizacion', v)}
              />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
