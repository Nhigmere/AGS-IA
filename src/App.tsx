import { useState } from 'react';
import { MotionConfig } from 'motion/react';
import { AppShell } from './components/layout/AppShell';
import { AcercaDelModeloModal } from './components/modals/AcercaDelModeloModal';
import { ExportarModal } from './components/modals/ExportarModal';
import { useAGSController } from './controllers/useAGSController';
import { useAGSStore } from './store/useAGSStore';
import { CatalogoView } from './views/CatalogoView';
import { ComparativaView } from './views/ComparativaView';
import { ConfiguracionView } from './views/ConfiguracionView';
import { ExperimentosView } from './views/ExperimentosView';
import { ResumenView } from './views/ResumenView';

export function App() {
  const vistaActiva = useAGSStore((s) => s.vistaActiva);
  const estadoEjecucion = useAGSStore((s) => s.estadoEjecucion);
  const generacionActual = useAGSStore((s) => s.generacionActual);
  const configuracion = useAGSStore((s) => s.configuracion);
  const resultadoAGS = useAGSStore((s) => s.resultadoAGS);
  const cantidadAlimentos = useAGSStore((s) => s.catalogo.length);
  const notificacionPendiente = useAGSStore((s) => s.notificacionPendiente);
  const modalModeloAbierto = useAGSStore((s) => s.modalModeloAbierto);

  const [modalExportarAbierto, setModalExportarAbierto] = useState(false);
  const controller = useAGSController();

  const alternarEjecucion = () => {
    if (estadoEjecucion === 'ejecutando') {
      void controller.pausar();
    } else if (estadoEjecucion === 'pausado') {
      void controller.reanudar();
    } else {
      controller.cambiarVista('resumen');
      void controller.ejecutar();
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <AppShell
        sidebarProps={{
          vistaActiva,
          estadoEjecucion,
          onCambiarVista: controller.cambiarVista,
          onAlternarEjecucion: alternarEjecucion,
          onReiniciar: () => void controller.reiniciar(),
          onExportar: () => setModalExportarAbierto(true),
          onAbrirModelo: controller.abrirModalModelo,
        }}
        topbarProps={{
          vistaActiva,
          estadoEjecucion,
          generacionActual,
          maxGeneraciones: configuracion.parametros.maxGeneraciones,
          semilla: configuracion.parametros.semilla,
          notificacionPendiente,
          detallesCorrida: {
            cantidadAlimentos,
            tamanoPoblacion: configuracion.parametros.tamanoPoblacion,
            maxGeneraciones: configuracion.parametros.maxGeneraciones,
            semilla: configuracion.parametros.semilla,
            tiempoMs: resultadoAGS?.tiempoMs ?? null,
            motivoParo: resultadoAGS?.motivoParo ?? null,
          },
          onCambiarVista: controller.cambiarVista,
          onAlternarEjecucion: alternarEjecucion,
          onDetener: () => void controller.detener(),
          onExportar: () => setModalExportarAbierto(true),
          onClickCampana: () => {
            controller.limpiarNotificacion();
            controller.cambiarVista('resumen');
          },
          onClickSemilla: () => controller.cambiarVista('configuracion'),
        }}
      >
        {vistaActiva === 'resumen' ? <ResumenView /> : null}
        {vistaActiva === 'configuracion' ? <ConfiguracionView /> : null}
        {vistaActiva === 'catalogo' ? <CatalogoView /> : null}
        {vistaActiva === 'comparativa' ? <ComparativaView /> : null}
        {vistaActiva === 'experimentos' ? <ExperimentosView /> : null}
      </AppShell>

      <AcercaDelModeloModal
        abierto={modalModeloAbierto}
        onCerrar={controller.cerrarModalModelo}
        nAlimentos={cantidadAlimentos}
        maxCalorias={configuracion.restricciones.maxCalorias}
        presupuesto={configuracion.restricciones.presupuesto}
        factorPenalizacion={configuracion.parametros.factorPenalizacion}
      />

      <ExportarModal
        abierto={modalExportarAbierto}
        onCerrar={() => setModalExportarAbierto(false)}
      />
    </MotionConfig>
  );
}
