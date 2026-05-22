import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { env } from "node:process";

export default defineConfig({
  base: env.GITHUB_ACTIONS ? "/barcode-battler-web/" : "/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
  },
});
