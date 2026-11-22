import type { ReporteGeneracion } from '../../models/types';

export type ObservadorProgreso = (reporte: ReporteGeneracion) => void;

/**
 * Sujeto del patrón Observer para difundir métricas por generación del MotorAGS.
 */
export class SujetoProgreso {
  private readonly observadores = new Set<ObservadorProgreso>();

  public suscribir(observador: ObservadorProgreso): () => void {
    this.observadores.add(observador);
    return () => {
      this.desuscribir(observador);
    };
  }

  public desuscribir(observador: ObservadorProgreso): void {
    this.observadores.delete(observador);
  }

  public notificar(reporte: ReporteGeneracion): void {
    for (const observador of this.observadores) {
      observador(reporte);
    }
  }

  public limpiar(): void {
    this.observadores.clear();
  }

  public get cantidadObservadores(): number {
    return this.observadores.size;
  }
}
