import type { ReactNode } from 'react';
import { GlassyBackground } from './GlassyBackground';
import { Sidebar, type SidebarProps } from './Sidebar';
import { Topbar, type TopbarProps } from './Topbar';

export interface AppShellProps {
  sidebarProps: SidebarProps;
  topbarProps: TopbarProps;
  children: ReactNode;
}

/**
 * Contenedor principal ("ventana") Glassy Dashboard V30:
 * envuelve Sidebar, Topbar y el contenido principal dentro de un único panel de vidrio esmerilado.
 */
export function AppShell({ sidebarProps, topbarProps, children }: AppShellProps) {
  return (
    <div className="relative min-h-screen w-full">
      <GlassyBackground />

      <div className="glass-window flex min-h-screen w-full flex-col gap-4 rounded-none border-0 p-4 pb-24 sm:p-5 md:flex-row md:pb-5 lg:p-6">
        <Sidebar {...sidebarProps} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar {...topbarProps} />
          <main className="flex min-w-0 flex-1 flex-col">{children}</main>
        </div>
      </div>
    </div>
  );
}
