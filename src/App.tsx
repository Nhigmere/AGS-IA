import { MotionConfig } from 'motion/react';
import { AppShell } from './components/layout/AppShell';
import { AcercaDelModeloModal } from './components/modals/AcercaDelModeloModal';
import { useAGSController } from './controllers/useAGSController';
import { useAGSStore } from './store/useAGSStore';
import { CatalogoView } from './views/CatalogoView';
import { ConfiguracionView } from './views/ConfiguracionView';
import { PerfilView } from './views/PerfilView';
import { ProgresoView } from './views/ProgresoView';
import { ResumenView } from './views/ResumenView';

export function App() {
  const vistaActiva = useAGSStore((s) => s.vistaActiva);
  const estadoEjecucion = useAGSStore((s) => s.estadoEjecucion);
  const generacionActual = useAGSStore((s) => s.generacionActual);
  const configuracion = useAGSStore((s) => s.configuracion);
  const cantidadAlimentos = useAGSStore((s) => s.catalogo.length);
  const modalModeloAbierto = useAGSStore((s) => s.modalModeloAbierto);

  const controller = useAGSController();

  return (
    <MotionConfig reducedMotion="user">
      <AppShell
        topbarProps={{
          vistaActiva,
          estadoEjecucion,
          generacionActual,
          maxGeneraciones: configuracion.parametros.maxGeneraciones,
          onCambiarVista: controller.cambiarVista,
          onDetener: () => void controller.detener(),
          onAbrirModelo: controller.abrirModalModelo,
        }}
      >
        {vistaActiva === 'perfil' ? <PerfilView /> : null}
        {vistaActiva === 'resumen' ? <ResumenView /> : null}
        {vistaActiva === 'progreso' ? <ProgresoView /> : null}
        {vistaActiva === 'catalogo' ? <CatalogoView /> : null}
        {vistaActiva === 'configuracion' ? <ConfiguracionView /> : null}
      </AppShell>

      <AcercaDelModeloModal
        abierto={modalModeloAbierto}
        onCerrar={controller.cerrarModalModelo}
        nAlimentos={cantidadAlimentos}
        maxCalorias={configuracion.restricciones.maxCalorias}
        presupuesto={configuracion.restricciones.presupuesto}
        factorPenalizacion={configuracion.parametros.factorPenalizacion}
      />
    </MotionConfig>
  );
}
