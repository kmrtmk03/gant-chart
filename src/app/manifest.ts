import type { MetadataRoute } from "next"

/**
 * PWA の Web アプリマニフェスト。
 * MEMO: theme_color / background_color は _tokens.scss の $color-primary / $color-bg と揃えている。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ガントチャート",
    short_name: "ガントチャート",
    description: "担当者ごとの案件の期間を一目で確認・編集できるガントチャート",
    lang: "ja",
    start_url: "/",
    display: "standalone",
    theme_color: "#2f6fed",
    background_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
