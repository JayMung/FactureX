import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

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
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  define: {
    // Désactiver les features qui causent des problèmes CSP
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
}));