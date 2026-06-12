import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const normalizeHost = (value) => {
    if (!value) return "";

    try {
      return new URL(value.startsWith("http") ? value : `https://${value}`).host;
    } catch {
      return value.replace(/^https?:\/\//, "").split("/")[0];
    }
  };

  const ngrok_path = normalizeHost(env.VITE_NGROK_PATH);
  const current_ngrok_host =
    "127e-2a03-32c0-33-8e79-a527-708d-96f8-fb34.ngrok-free.app";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      allowedHosts: [...new Set([current_ngrok_host, ngrok_path].filter(Boolean))],
      proxy: {
        "/api": "http://127.0.0.1:8000",
      },
      hmr: {
        protocol: "wss",
        host: ngrok_path || current_ngrok_host,
        clientPort: 443,
      },
    },
  };
});
