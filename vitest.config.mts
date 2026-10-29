import path from "node:path"

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    // localStorage を使うテストは、jsdom を入れずにメモリ上の Storage のモックを repository に渡して行う
    environment: "node",
  },
})
