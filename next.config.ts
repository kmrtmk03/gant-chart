import path from "node:path"

import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  sassOptions: {
    // 各 *.module.scss から @use "tokens" で読めるようにする
    loadPaths: [path.join(process.cwd(), "src/styles")],
  },
  async headers() {
    return [
      {
        // 全ページに付けるセキュリティ関連のヘッダー
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Service Worker は常に最新を取得させる
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ]
  },
}

export default nextConfig
