import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Gradient } from '../lib/gradient';

const PAGE_CONFIG = {
  '/plans':  { top: '-40vh', height: '85vh' },
  '/finder': { top: '0', height: '100vh' },
  '/profile': { top: '-30vh', height: '85vh' },
  '/about': { top: '-30vh', height: '85vh' },
};
const DEFAULT_CONFIG = { top: '-36vh', height: '85vh' };

export default function GradientBackground() {
  const canvasRef = useRef(null);
  const gradientRef = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    if (!canvasRef.current) return;
    const gradient = new Gradient();
    gradientRef.current = gradient;
    gradient.colors = ['#6ED7B4', '#6DCBCA', '#1FA9FF', '#6ED7B4'];
    gradient.initGradient('#gradient-canvas');

    return () => {
      gradient.disconnect();
    };
  }, []);

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
          '--gradient-color-1': '#6ED7B4',
          '--gradient-color-2': '#6DCBCA',
          '--gradient-color-3': '#1FA9FF',
          '--gradient-color-4': '#6ED7B4',
        }}
      />
    </div>
  );
}
