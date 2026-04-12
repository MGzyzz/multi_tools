import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const ngrok_path = env.VITE_NGROK_PATH;

  const allowedHosts = ['localhost', '127.0.0.1'];
  if (ngrok_path) {
    try { allowedHosts.push(new URL(ngrok_path).hostname); } catch {}
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      allowedHosts,
      proxy: {
        "/api": "http://127.0.0.1:8000",
      },
      hmr: {
        protocol: "wss",
        host: ngrok_path,
        clientPort: 443,
      },
    },
  };
});