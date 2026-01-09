import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: "./index.html",
        sw: "./public/service-worker.js",
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === "sw"
            ? "service-worker.js"
            : "[name]-[hash].js";
        },
        manualChunks: {
          // Separar React y React-DOM
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Separar Framer Motion (es grande)
          "vendor-motion": ["framer-motion"],
          // Separar otras librerías de UI
          "vendor-ui": ["react-select", "lucide-react"],
          // Separar librerías de WebSocket
          "vendor-realtime": ["laravel-echo", "pusher-js"],
        },
      },
    },
  },
});
