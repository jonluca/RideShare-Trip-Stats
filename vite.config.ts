import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { ManifestV3Export } from "@crxjs/vite-plugin";
import { crx } from "@crxjs/vite-plugin";
import manifestJson from "./manifest.json";

const manifest: ManifestV3Export = manifestJson as ManifestV3Export;
export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    minify: false,
    rollupOptions: {
      input: {
        oninstall: "html/oninstall.html",
        welcome: "index.html",
      },
    },
  },
  legacy: {
    skipWebSocketTokenCheck: true,
  },
  server: {
    cors: {
      origin: "*",
    },
  },
});
