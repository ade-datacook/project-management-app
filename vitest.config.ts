import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

// On recrée __dirname manuellement pour éviter le bug "undefined"
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
  },
});