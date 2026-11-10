"use client"

import { useEffect } from "react"

/** Service Worker のファイルパス（public/sw.js） */
const SERVICE_WORKER_PATH = "/sw.js"

/**
 * Service Worker を登録する。画面は何も描画しない。
 * layout.tsx に 1 回だけ置くこと。
 * MEMO: 開発中に古い Service Worker が残って挙動が分かりにくくなるのを避けるため、
 *       登録は本番ビルドのときだけ行う。
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker
      .register(SERVICE_WORKER_PATH, { scope: "/", updateViaCache: "none" })
      .catch((error: unknown) => {
        console.error("Service Worker の登録に失敗しました", error)
      })
  }, [])

  return null
}
