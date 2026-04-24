import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          animation: ['framer-motion'],
          chart: ['echarts'],
          ui: ['lucide-react', '@radix-ui/react-tabs', 'sonner'],
        },
      },
    },
    target: 'es2015',
  },
  esbuild: {
    logOverride: { 'duplicate-attribute': 'silent' },
    drop: ['console', 'debugger'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    tsconfigPaths(),
    {
      name: 'inject-config-script',
      transformIndexHtml: {
        order: 'pre',
        handler: (html: string, ctx) => {
          if (ctx?.bundle) {
            return html.replace(
              '</head>',
              '    <!-- 运行时配置文件 -->\n    <script src="/config.js"></script>\n  </head>'
            );
          }
          return html;
        }
      }
    }
  ],
})
