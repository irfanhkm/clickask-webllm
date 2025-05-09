import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";
import tailwindcss from 'tailwindcss';

function generateManifest() {
  const manifest = readJsonFile("src/manifest.json");
  const pkg = readJsonFile("package.json");
  return {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    ...manifest,
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: true
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss()],
    },
  },
  plugins: [
    react(),
    webExtension({
      manifest: generateManifest,
      browser: "chrome"
    }),
  ],
});
