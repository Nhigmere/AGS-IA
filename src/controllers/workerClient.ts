import { type Remote, wrap } from 'comlink';
import type { APIWorkerAGS } from '../workers/types';

let workerInstancia: Worker | null = null;
let proxyInstancia: Remote<APIWorkerAGS> | null = null;

/**
 * Devuelve una instancia perezosa y reutilizable del Web Worker envuelto con Comlink.
 * El hilo principal de React nunca ejecuta el MotorAGS directamente.
 */
export function obtenerWorkerAGS(): Remote<APIWorkerAGS> {
  if (proxyInstancia === null) {
    workerInstancia = new Worker(new URL('../workers/agsWorker.ts', import.meta.url), {
      type: 'module',
    });
    proxyInstancia = wrap<APIWorkerAGS>(workerInstancia);
  }
  return proxyInstancia;
}

export function terminarWorkerAGS(): void {
  if (workerInstancia !== null) {
    workerInstancia.terminate();
    workerInstancia = null;
    proxyInstancia = null;
  }
}
