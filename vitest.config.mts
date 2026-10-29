import path from "node:path"

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    // TODO: localStorage を使うテストはフェーズ 3 で jsdom 導入かモックかを決める
    environment: "node",
  },
})
