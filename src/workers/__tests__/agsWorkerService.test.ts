import { describe, expect, it, vi } from 'vitest';
import { CATALOGO_INICIAL_DATOS } from '../../data/catalogoInicial';
import type { ConfiguracionEjecucion } from '../../models/types';
import { PARAMETROS_POR_DEFECTO, RESTRICCIONES_POR_DEFECTO } from '../../patterns/singleton';
import { crearServicioAGSWorker } from '../agsWorkerService';

const configRapida: ConfiguracionEjecucion = {
  restricciones: RESTRICCIONES_POR_DEFECTO,
  parametros: {
    ...PARAMETROS_POR_DEFECTO,
    tamanoPoblacion: 25,
    maxGeneraciones: 20,
    porcentajeEstancamiento: 0,
  },
};

describe('agsWorkerService (Worker Comlink)', () => {
  it('ejecuta AGS y línea base aleatoria con presupuesto de evaluaciones idéntico', async () => {
    const servicio = crearServicioAGSWorker();
    const reportes: number[] = [];

    const { ags, aleatorio } = await servicio.ejecutarAGS(
      CATALOGO_INICIAL_DATOS,
      configRapida,
      (rep) => reportes.push(rep.generacion),
    );

    expect(ags.generacionesEjecutadas).toBe(20);
    expect(ags.evaluacionesTotales).toBe(500);
    expect(aleatorio.evaluacionesTotales).toBe(500);
    expect(ags.mejorIndividuo?.factible).toBe(true);
    expect(reportes).toHaveLength(20);
  });

  it('permite pausar, reanudar y detener una corrida en curso', async () => {
    const servicio = crearServicioAGSWorker();
    const configLarga: ConfiguracionEjecucion = {
      restricciones: RESTRICCIONES_POR_DEFECTO,
      parametros: {
        ...PARAMETROS_POR_DEFECTO,
        tamanoPoblacion: 40,
        maxGeneraciones: 200,
        porcentajeEstancamiento: 0,
      },
    };

    const promesa = servicio.ejecutarAGS(CATALOGO_INICIAL_DATOS, configLarga, (rep) => {
      if (rep.generacion === 3) {
        servicio.pausarAGS();
        setTimeout(() => {
          servicio.reanudarAGS();
        }, 5);
      }
      if (rep.generacion === 8) {
        servicio.detenerAGS();
      }
    });

    const { ags } = await promesa;
    expect(ags.motivoParo).toBe('cancelado');
    expect(ags.generacionesEjecutadas).toBeGreaterThanOrEqual(8);
    expect(ags.generacionesEjecutadas).toBeLessThan(200);
  });

  it('ejecuta comparativa de R corridas calculando media, desviación y curva promedio', async () => {
    const servicio = crearServicioAGSWorker();
    const onProgreso = vi.fn();

    const resultado = await servicio.ejecutarComparativaMultiCorrida(
      CATALOGO_INICIAL_DATOS,
      configRapida,
      3,
      onProgreso,
    );

    expect(resultado.cantidadCorridas).toBe(3);
    expect(resultado.corridasDetalle).toHaveLength(3);
    expect(resultado.estadisticasAGS.proteinaMedia).toBeGreaterThan(0);
    expect(resultado.estadisticasAGS.porcentajeFactibles).toBe(100);
    expect(resultado.estadisticasAleatorio.evaluacionesPorCorrida).toBe(
      resultado.estadisticasAGS.evaluacionesPorCorrida,
    );
    expect(resultado.curvaPromedio).toHaveLength(20);
    expect(onProgreso).toHaveBeenCalledTimes(3);
  });

  it('ejecuta barrido de experimentos Pc × Pm con barra de progreso', async () => {
    const servicio = crearServicioAGSWorker();
    const onProgreso = vi.fn();

    const resultado = await servicio.ejecutarBarridoExperimentos(
      CATALOGO_INICIAL_DATOS,
      configRapida,
      {
        valoresPc: [0.7, 0.9],
        valoresPm: [0.02, 0.05],
        corridasPorCombinacion: 2,
      },
      onProgreso,
    );

    expect(resultado.cancelado).toBe(false);
    expect(resultado.celdas).toHaveLength(4);
    expect(resultado.totalCorridasEjecutadas).toBe(8);
    expect(onProgreso).toHaveBeenCalledTimes(8);
    for (const celda of resultado.celdas) {
      expect(celda.proteinaMedia).toBeGreaterThan(0);
      expect(celda.curvaPromedio.length).toBeGreaterThan(0);
    }
  });
});
