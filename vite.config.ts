import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx, ManifestV3Export } from "@crxjs/vite-plugin";
import manifestJson from "./manifest.json";

const manifest: ManifestV3Export = manifestJson as ManifestV3Export;
export default defineConfig({
  plugins: [react(), crx({ manifest })],
});
