import { useId } from 'react';

/**
 * Fondo premium gris carbón (#1a1b1f) con dos manchas difusas (cálida y azulada)
 * y textura sutil de grano SVG al 3.5 % de opacidad.
 */
export function GlassyBackground() {
  const noiseId = useId();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#1a1b1f]"
    >
      {/* Mancha de luz difusa cálida (superior izquierda) */}
      <div
        className="absolute -top-36 left-[12%] h-[40rem] w-[40rem] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(245, 198, 138, 0.16) 0%, rgba(245, 198, 138, 0.04) 48%, transparent 72%)',
        }}
      />

      {/* Mancha de luz difusa azulada (inferior derecha) */}
      <div
        className="absolute -right-28 -bottom-36 h-[44rem] w-[44rem] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(79, 140, 255, 0.2) 0%, rgba(79, 140, 255, 0.05) 50%, transparent 74%)',
        }}
      />

      {/* Overlay de grano SVG al 3.5 % de opacidad */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.035]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id={noiseId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${noiseId})`} />
      </svg>
    </div>
  );
}
