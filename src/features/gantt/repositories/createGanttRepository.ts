import type { IGanttRepository } from "./ganttRepository.type"
import { LocalStorageRepository } from "./localStorageRepository"

/**
 * 画面やフックが使う repository を生成する。保存先の実装を差し替えるのはここ 1 か所だけにする。
 *
 * MEMO: Firestore へ移行するときの手順
 * 1. `src/app/api/` に Route Handler を作り、サーバー側で Firebase Admin SDK を使って Firestore を読み書きする
 *    （Firebase の設定値やサービスアカウントに NEXT_PUBLIC_ を付けず、クライアントに含めない）
 * 2. IGanttRepository を実装した ApiRepository（fetch で Route Handler を呼ぶ）を repositories/ に作る。
 *    レスポンスは unknown で受け、gantt.guards.ts の型ガードで検証する
 * 3. ここの戻り値を `new ApiRepository()` に替える（呼び出し側のコードは変えなくてよい）
 */
export function createGanttRepository(): IGanttRepository {
  return new LocalStorageRepository()
}
