/**
 * Decorative SVG wave lines overlay with floating bubbles.
 * Drop inside any `page-hero` container (must be `relative`).
 */
export default function WaveLines() {
  return (
    <>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full z-[1]"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1440 800"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main wave line */}
        <path
          d="M-50,500 C150,380 350,580 600,450 C850,320 1050,520 1250,400 C1350,340 1400,380 1500,360"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {/* Second wave — offset */}
        <path
          d="M-50,520 C180,400 380,600 630,470 C880,340 1080,540 1280,420 C1380,360 1420,400 1500,380"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        {/* Third wave — lower */}
        <path
          d="M-50,560 C200,440 400,640 650,510 C900,380 1100,560 1300,440 C1400,380 1440,420 1500,400"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        {/* Soft glow along the main wave */}
        <path
          d="M-50,500 C150,380 350,580 600,450 C850,320 1050,520 1250,400 C1350,340 1400,380 1500,360"
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="25"
          filter="url(#waveGlow)"
        />
        <defs>
          <filter id="waveGlow">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
      </svg>
    </>
  );
}
