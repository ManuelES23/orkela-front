import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Config de test separada de vite.config.js: éste último trae el
// rollupOptions.input de producción (main + service-worker), que no aplica
// (y no debe interferir) al correr Vitest.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.js"],
    globals: false,
    // Margen para tests con muchos ciclos de act/temporizadores falsos
    // cuando corren en paralelo con el resto de la suite.
    testTimeout: 20000,
  },
});
