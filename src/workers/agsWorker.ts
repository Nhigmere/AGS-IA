import { expose } from 'comlink';
import { crearServicioAGSWorker } from './agsWorkerService';

expose(crearServicioAGSWorker());
