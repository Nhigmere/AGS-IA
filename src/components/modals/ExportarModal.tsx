import { useEffect } from 'react';
import { Download, FileJson, FileSpreadsheet, X } from 'lucide-react';
import { useAGSStore } from '../../store/useAGSStore';
import { exportarCorridaCompletaJSON, exportarHistorialCSV } from '../../utils/exportacion';

export interface ExportarModalProps {
  abierto: boolean;
  onCerrar: () => void;
}

export function ExportarModal({ abierto, onCerrar }: ExportarModalProps) {
  const catalogo = useAGSStore((s) => s.catalogo);
  const configuracion = useAGSStore((s) => s.configuracion);
  const historialAGS = useAGSStore((s) => s.historialAGS);
  const resultadoAGS = useAGSStore((s) => s.resultadoAGS);
  const resultadoAleatorio = useAGSStore((s) => s.resultadoAleatorio);

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
      aria-labelledby="titulo-modal-exportar"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div className="glass-card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white">
              <Download size={18} />
            </span>
            <div>
              <h2 id="titulo-modal-exportar" className="text-base font-semibold text-white">
                Exportar resultados para reporte
              </h2>
              <p className="text-xs text-white/55">
                Archivos reproducibles JSON y tablas CSV compatibles con Excel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar ventana de exportación"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/75 hover:bg-white/20 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          <button
            type="button"
            onClick={() =>
              exportarCorridaCompletaJSON(catalogo, configuracion, resultadoAGS, resultadoAleatorio)
            }
            className="flex w-full items-center justify-between rounded-2xl border border-white/12 bg-white/[0.07] px-4 py-3 text-left transition-colors hover:bg-white/[0.14]"
          >
            <div className="flex items-center gap-3">
              <FileJson size={18} className="text-[#4F8CFF]" />
              <div>
                <p className="text-sm font-medium text-white">Corrida completa (JSON)</p>
                <p className="text-xs text-white/50">
                  Catálogo, configuración, semilla #{configuracion.parametros.semilla} y resultados
                </p>
              </div>
            </div>
            <span className="glass-chip px-2.5 py-1 text-[11px] text-white/80">JSON</span>
          </button>

          <button
            type="button"
            disabled={historialAGS.length === 0}
            onClick={() =>
              exportarHistorialCSV(
                historialAGS,
                resultadoAleatorio?.historial ?? [],
                configuracion.parametros.semilla,
              )
            }
            className="flex w-full items-center justify-between rounded-2xl border border-white/12 bg-white/[0.07] px-4 py-3 text-left transition-colors hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={18} className="text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-white">Historial generacional (CSV)</p>
                <p className="text-xs text-white/50">
                  {historialAGS.length > 0
                    ? `${historialAGS.length} generaciones registradas`
                    : 'Ejecuta el AGS primero para habilitar'}
                </p>
              </div>
            </div>
            <span className="glass-chip px-2.5 py-1 text-[11px] text-white/80">CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
}
