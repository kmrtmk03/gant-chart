// 最小限の Service Worker。インストール可能にするためだけに置いている。
// fetch ハンドラを持たないため、リクエストはキャッシュされず、そのままネットワークに流れる。
// TODO: オフライン対応が必要になったら、Serwist などでキャッシュ戦略を導入する。

// 古い Service Worker を待たずに、すぐ有効化する
self.addEventListener("install", () => {
  self.skipWaiting()
})

// 開いているページをすぐ制御下に置く
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})
