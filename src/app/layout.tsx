import type { Metadata } from "next"

import "@/styles/globals.scss"

export const metadata: Metadata = {
  title: "ガントチャート",
}

/**
 * アプリ全体のレイアウト。
 * MEMO: オフライン・身内利用を前提に、Google Fonts は使わずシステムフォントを使う（globals.scss 側で指定）。
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
