import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,          // важно, чтобы Vite слушал извне
    allowedHosts: true,
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
    hmr: {
      protocol: "wss",
      host: "139ca65c6bce.ngrok-free.app", // <-- твой ngrok фронта
      clientPort: 443,
    },
  },
});