import { useEffect } from 'react';
import { BookOpen, X } from 'lucide-react';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

export interface AcercaDelModeloModalProps {
  abierto: boolean;
  onCerrar: () => void;
  nAlimentos: number;
  maxCalorias: number;
  presupuesto: number;
  factorPenalizacion: number;
}

export function AcercaDelModeloModal({
  abierto,
  onCerrar,
  nAlimentos,
  maxCalorias,
  presupuesto,
  factorPenalizacion,
}: AcercaDelModeloModalProps) {
  useEffect(() => {
    if (!abierto) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modelo-matematico"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        className="glass-card glass-scroll max-h-[88vh] w-full max-w-3xl overflow-y-auto p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#4F8CFF]/40 bg-[#4F8CFF]/20 text-[#9BC0FF]">
              <BookOpen size={18} />
            </span>
            <div>
              <h2 id="titulo-modelo-matematico" className="text-lg font-semibold text-white">
                Formulación Matemática del Modelo
              </h2>
              <p className="text-xs text-white/55">
                AGS para el Problema de la Dieta (Mochila 0-1 Multidimensional) · ITO
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar panel del modelo"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/75 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 space-y-5 text-sm leading-relaxed text-white/80">
          <section className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <h3 className="text-xs font-semibold tracking-wider text-[#9BC0FF] uppercase">
              1. Codificación binaria (Objetivo específico 1)
            </h3>
            <p className="mt-2 text-xs text-white/70">
              Cada dieta candidata se representa mediante un vector binario de longitud fija{' '}
              <InlineMath math={`N = ${nAlimentos}`} />, donde cada gen indica si se incluye una
              porción estándar del alimento <InlineMath math="i" />:
            </p>
            <div className="mt-2 overflow-x-auto text-white">
              <BlockMath math="\mathbf{x} = (x_1, x_2, \dots, x_N) \in \{0, 1\}^N" />
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <h3 className="text-xs font-semibold tracking-wider text-[#9BC0FF] uppercase">
              2. Función objetivo y restricciones duras
            </h3>
            <p className="mt-2 text-xs text-white/70">
              Se maximiza la proteína diaria total (g) sujeto al límite calórico{' '}
              <InlineMath math={`C_{\\max} = ${maxCalorias}\\text{ kcal}`} /> y al presupuesto{' '}
              <InlineMath math={`B_{\\max} = \\$${presupuesto}\\text{ MXN}`} />:
            </p>
            <div className="mt-2 overflow-x-auto text-white">
              <BlockMath math="\max \; P(\mathbf{x}) = \sum_{i=1}^{N} x_i \, p_i" />
              <BlockMath math="\text{sujeto a:} \quad \sum_{i=1}^{N} x_i \, c_i \le C_{\max}, \qquad \sum_{i=1}^{N} x_i \, k_i \le B_{\max}" />
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <h3 className="text-xs font-semibold tracking-wider text-[#9BC0FF] uppercase">
              3. Función de aptitud con penalización estática (Objetivo específico 2)
            </h3>
            <p className="mt-2 text-xs text-white/70">
              Las soluciones que violan alguna restricción reciben un factor estático{' '}
              <InlineMath math={`\\alpha = ${factorPenalizacion}`} /> (encapsulado bajo el patrón{' '}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px]">Strategy</code>):
            </p>
            <div className="mt-2 overflow-x-auto text-white">
              <BlockMath math="f(\mathbf{x}) = \begin{cases} P(\mathbf{x}) & \text{si } C(\mathbf{x}) \le C_{\max} \;\land\; K(\mathbf{x}) \le B_{\max} \\ \alpha \cdot P(\mathbf{x}) & \text{en otro caso} \end{cases}" />
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <h3 className="text-xs font-semibold tracking-wider text-[#9BC0FF] uppercase">
              4. Operadores evolutivos, diversidad y paro
            </h3>
            <ul className="mt-2 space-y-2 text-xs text-white/75">
              <li>
                <strong className="text-white">Inicialización sesgada:</strong>{' '}
                <InlineMath math="P(x_i = 1) = p_{\text{inicial}} = 0.20" /> para generar una
                población inicial mayormente factible.
              </li>
              <li>
                <strong className="text-white">Selección por torneo:</strong> se muestrean{' '}
                <InlineMath math="k = 3" /> individuos y gana el de mayor aptitud.
              </li>
              <li>
                <strong className="text-white">Cruce de un punto:</strong> con probabilidad{' '}
                <InlineMath math="P_c = 0.80" /> en un punto aleatorio{' '}
                <InlineMath math="q \in [1, N-1]" />.
              </li>
              <li>
                <strong className="text-white">Mutación bit-flip:</strong> cada gen cambia con
                probabilidad <InlineMath math="P_m \approx 1/N" />.
              </li>
              <li>
                <strong className="text-white">Diversidad poblacional (Hamming exacta):</strong>
                <div className="mt-1 overflow-x-auto text-white">
                  <BlockMath math="D = \frac{2}{N \cdot P(P-1)} \sum_{j=1}^{N} c_j (P - c_j) \in [0, 1]" />
                </div>
              </li>
              <li>
                <strong className="text-white">Paro anticipado:</strong> cuando el mejor factible
                global no mejora más de <InlineMath math="\varepsilon = 0.01\text{ g}" /> durante el
                porcentaje configurado de generaciones consecutivas.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
