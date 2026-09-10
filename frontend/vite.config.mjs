import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Import "@/" anywhere to resolve to the src directory.
      "@": path.resolve(__dirname, "src"),
    },
  },
  // Keep the CRA-era REACT_APP_ prefix so existing env vars keep working.
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
    // Split vendor libraries into stable chunks for better caching.
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