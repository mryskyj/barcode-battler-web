import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { env } from "node:process";

export default defineConfig({
  base: env.GITHUB_ACTIONS ? "/barcode-battler-web/" : "/",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/firebase")) {
            return "vendor-firebase";
          }

          if (id.includes("node_modules/@zxing")) {
            return "vendor-zxing";
          }

          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom")
          ) {
            return "vendor-react";
          }

          return undefined;
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
  },
});
