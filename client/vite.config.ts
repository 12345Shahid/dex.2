import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
        ws: true,
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
  }
}); 