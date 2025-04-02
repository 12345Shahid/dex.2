import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      }
    },
    fs: {
      // Allow serving files from one level up (the project root)
      allow: ['..']
    }
  },
  // Make sure the base path is correct
  base: '/',
  build: {
    // Generate source maps for better debugging
    sourcemap: true,
    rollupOptions: {
      external: ['drizzle-orm/pg-core', 'drizzle-zod'],
      output: {
        manualChunks: {
          'pdf': ['jspdf', 'jspdf-autotable']
        }
      }
    },
    outDir: 'dist'
  }
}); 