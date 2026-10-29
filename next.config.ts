import path from "node:path"

import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  sassOptions: {
    // 各 *.module.scss から @use "tokens" で読めるようにする
    loadPaths: [path.join(process.cwd(), "src/styles")],
  },
}

export default nextConfig
