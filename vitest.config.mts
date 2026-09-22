import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Same "@/" alias the app uses, so tests import the real modules by their
    // real paths. This is what replaces the tsc-then-sed dance Phases 3–6 used.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Node, not jsdom: everything under test here is pure logic. Component
    // tests would need a DOM, and those are better spent on a real session.
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
