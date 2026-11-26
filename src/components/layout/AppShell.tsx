import type { ReactNode } from 'react';
import { GlassyBackground } from './GlassyBackground';
import { Topbar, type TopbarProps } from './Topbar';

export interface AppShellProps {
  topbarProps: TopbarProps;
  children: ReactNode;
}

/**
 * Contenedor principal minimalista: una sola barra superior clara
 * y espacio centrado para que el flujo sea fácil de seguir.
 */
export function AppShell({ topbarProps, children }: AppShellProps) {
  return (
    <div className="relative min-h-screen w-full">
      <GlassyBackground />

      <div className="glass-window flex min-h-screen w-full flex-col rounded-none border-0 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
          <Topbar {...topbarProps} />
          <main className="flex min-w-0 flex-1 flex-col">{children}</main>
        </div>
      </div>
    </div>
  );
}
