import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function preloadHeadingFont() {
  return {
    name: "preload-heading-font",
    apply: "build",
    writeBundle() {
      const assetsDir = path.resolve(__dirname, "build/assets");
      const htmlPath = path.resolve(__dirname, "build/index.html");
      if (!fs.existsSync(htmlPath) || !fs.existsSync(assetsDir)) return;
      const font = fs
        .readdirSync(assetsDir)
        .find(
          (name) =>
            name.includes("poppins-latin-900-normal") && name.endsWith(".woff2"),
        );
      if (!font) return;
      let html = fs.readFileSync(htmlPath, "utf8");
      const link = `<link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/${font}" />`;
      if (html.includes("rel=\"preload\" as=\"font\"")) return;
      html = html.replace("<title>", `${link}\n    <title>`);
      fs.writeFileSync(htmlPath, html);
    },
  };
}

export default defineConfig({
  plugins: [react(), preloadHeadingFont()],
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("clerk")) return "vendor-clerk";
          if (id.includes("@vapi-ai")) return "vendor-vapi";
          if (id.includes("framer-motion") || id.includes("motion-dom")) return "vendor-motion";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("axios")) return "vendor-axios";
          if (id.includes("sonner")) return "vendor-sonner";
          if (id.includes("react") || id.includes("scheduler") || id.includes("react-router")) return "vendor-react";
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
  },
});
