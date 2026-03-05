import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Gradient } from '../lib/gradient';
import { useLang } from '../context/LanguageContext';

interface PageConfig {
  top: string;
  height: string;
  fixed?: boolean;
}

// Use max() to guarantee minimum coverage on small phones
// while scaling up on larger screens — ensures consistent look
const PAGE_CONFIG: Record<string, PageConfig> = {
  '/plans':  { top: 'max(-320px, -40dvh)', height: 'max(720px, 85dvh)' },
  '/finder': { top: '0', height: '100dvh' },
  '/profile': { top: 'max(-260px, -30dvh)', height: 'max(720px, 85dvh)' },
  '/about': { top: 'max(-260px, -30dvh)', height: 'max(720px, 85dvh)' },
};
const DEFAULT_CONFIG: PageConfig = { top: 'max(-300px, -36dvh)', height: 'max(720px, 85dvh)' };

const LIGHT_COLORS = ['#6ED7B4', '#6DCBCA', '#1FA9FF', '#6ED7B4'];
const DARK_COLORS = ['#1A6B5A', '#1A5F6B', '#0D5FAA', '#1A6B5A'];

export default function GradientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gradientRef = useRef<InstanceType<typeof Gradient> | null>(null);
  const { pathname } = useLocation();
  const { theme } = useLang();

  const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  useEffect(() => {
    if (!canvasRef.current) return;
    // Disconnect previous gradient if it exists
    if (gradientRef.current) {
      gradientRef.current.disconnect();
    }
    const gradient = new Gradient();
    gradientRef.current = gradient;
    gradient.colors = colors;
    gradient.initGradient('#gradient-canvas');

    return () => {
      gradient.disconnect();
    };
  }, [theme]);

  const config = PAGE_CONFIG[pathname] || DEFAULT_CONFIG;
  const isFixed = config.fixed;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none z-0 overflow-hidden transition-all duration-500 ${isFixed ? 'fixed inset-0' : 'absolute inset-x-0'}`}
      style={isFixed ? {} : { top: config.top, height: config.height }}
    >
      <canvas
        ref={canvasRef}
        id="gradient-canvas"
        data-js-darken-top
        data-transition-in
        style={{
          width: '100%',
          height: '100%',
          '--gradient-color-1': colors[0],
          '--gradient-color-2': colors[1],
          '--gradient-color-3': colors[2],
          '--gradient-color-4': colors[3],
        } as React.CSSProperties}
      />
    </div>
  );
}
