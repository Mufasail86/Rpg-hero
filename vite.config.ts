import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";

// Список файлов сборки для офлайн-копии: sw.js скачивает их в фоне, не загружая главный поток.
function precacheList(): Plugin {
  return {
    name: "rpg-hero-precache-list",
    apply: "build",
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((name) => /\.(js|css)$/.test(name)).sort();
      this.emitFile({ type: "asset", fileName: "precache.json", source: JSON.stringify(files) });
    },
  };
}

// Большие таблицы справочника кладём в отдельные файлы: они качаются параллельно,
// только когда нужны, и остаются в кэше браузера, пока не поменяются.
const DATA_CHUNK = /\/src\/data\/generated\/((?:pf|srd|monsters)-[a-z0-9-]+)\.json$/;

export default defineConfig({
  base: "./",
  plugins: [react(), precacheList()],
  build: {
    chunkSizeWarningLimit: 7000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const match = id.replace(/\\/g, "/").match(DATA_CHUNK);
          return match ? `data-${match[1]}` : undefined;
        },
      },
    },
  },
  test: {
    environment: "node",
  },
});
