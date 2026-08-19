import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  envPrefix: ["REACT_APP_", "VITE_"],
  esbuild: {
    include: /\.(m?ts|[jt]sx?)$/,
    exclude: /\/node_modules\//,
    loader: "jsx",
  },
  build: {
    target: "es2018",
    sourcemap: false,
    outDir: "build",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
  },
});
