import { defineConfig, type PluginOption } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ['..']
    }
  },
  // Désactiver les source maps en développement pour éviter les erreurs CSP
  esbuild: {
    sourcemap: false
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: ['facturex.coccinelledrc.com', '.easypanel.host']
  },
  plugins: [
    /* dyadComponentTagger(), */
    react(),
    // Bundle Analyzer — activé via `pnpm run analyze`
    ...(process.env.ANALYZE ? [visualizer({
      filename: './dist/bundle-report.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }) as PluginOption] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-utils': ['lucide-react', 'date-fns', 'clsx', 'tailwind-merge'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  define: {
    // Désactiver les features qui causent des problèmes CSP
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
}));