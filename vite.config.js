import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Prevent Vite from bundling /sdk/kaspa.js — it is loaded at runtime
// from the public/ folder (same pattern as xenom-web-wallet).
const kaspaExternalPlugin = {
  name: 'kaspa-sdk-external',
  enforce: 'pre',
  resolveId(id) {
    if (id === '/sdk/kaspa.js' || id.endsWith('/sdk/kaspa.js')) {
      return { id, external: true };
    }
  },
};

export default defineConfig({
  plugins: [kaspaExternalPlugin, react()],
  server: {
    port: 5174,
    historyApiFallback: true,
  },
  preview: {
    historyApiFallback: true,
    allowedHosts: ['testnet.xenom.space'],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      external: ['/sdk/kaspa.js'],
    },
  },
})
