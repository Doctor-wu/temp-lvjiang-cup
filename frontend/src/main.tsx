import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { SpriteProvider } from '@/components/icons/PositionIcons';
import { reportWebVitals } from '@/utils/performance';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <SpriteProvider>
        <App />
      </SpriteProvider>
      <Toaster
        position="top-center"
        richColors
        closeButton
        duration={4000}
        toastOptions={{
          style: {
            fontFamily: 'inherit',
          },
        }}
      />
    </ErrorBoundary>
  </StrictMode>
);

/**
 * 启动性能监控
 * 收集 FCP、LCP、CLS、TTFB、INP 等核心 Web Vitals 指标
 */
reportWebVitals();
