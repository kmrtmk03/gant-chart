import "server-only"

import {
  type App,
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app"
import { type Firestore, getFirestore } from "firebase-admin/firestore"

/**
 * Firebase Admin SDK の初期化と Firestore クライアントの取得（サーバー専用）。
 *
 * - Route Handler など、サーバー側のコードからだけ使う。クライアントのコードから import しない
 *   （先頭の `server-only` により、クライアントのバンドルに入るとビルドが失敗する）
 * - Firebase の設定値・秘密鍵には `NEXT_PUBLIC_` を付けない（クライアントに公開しないため）
 * - エミュレーターは使わない。ローカル開発（`.env.local`）も本番と同じ Firebase プロジェクトにつなぐ
 */

/** 環境変数の名前。値の説明は `.env.example` を参照 */
const ENV_PROJECT_ID = "FIREBASE_PROJECT_ID"
const ENV_CLIENT_EMAIL = "FIREBASE_CLIENT_EMAIL"
const ENV_PRIVATE_KEY = "FIREBASE_PRIVATE_KEY"

/** 環境変数で改行が `\n` の 2 文字として渡された秘密鍵を、実際の改行に戻す */
function restoreLineBreaks(privateKey: string): string {
  return privateKey.replace(/\\n/g, "\n")
}

/**
 * 空文字を「未設定」として扱って環境変数を読む。
 * `.env.example` の空のひな形をそのままコピーしたときに、空文字を認証情報として使わないため
 */
function readEnv(name: string): string | undefined {
  const value = process.env[name]
  return value === undefined || value === "" ? undefined : value
}

/**
 * 認証情報を選んで Admin SDK のアプリを初期化する。
 * 1. FIREBASE_CLIENT_EMAIL と FIREBASE_PRIVATE_KEY があれば、サービスアカウントで初期化する（Vercel など）
 * 2. 両方とも未設定なら、アプリケーションのデフォルト認証情報で初期化する（Firebase App Hosting / Cloud Run）
 *
 * 片方だけ設定されているのは設定ミス（貼り忘れ）なので、デフォルト認証情報には進まず、
 * 不足している変数名を示すエラーにする（進むと、最初の読み書きで原因の分かりにくい認証エラーになるため）。
 *
 * @throws Error 認証情報が片方しかないとき、またはサービスアカウントを使うのに FIREBASE_PROJECT_ID がないとき
 */
function createApp(): App {
  const projectId = readEnv(ENV_PROJECT_ID)
  const clientEmail = readEnv(ENV_CLIENT_EMAIL)
  const privateKey = readEnv(ENV_PRIVATE_KEY)

  // サービスアカウントの 2 つは「両方ある」か「両方ない」のどちらかでなければならない
  if ((clientEmail === undefined) !== (privateKey === undefined)) {
    const missingName =
      clientEmail === undefined ? ENV_CLIENT_EMAIL : ENV_PRIVATE_KEY
    throw new Error(
      `[gantt] ${missingName} が設定されていません。サービスアカウントを使うときは ${ENV_CLIENT_EMAIL} と ${ENV_PRIVATE_KEY} の両方を設定してください（デフォルト認証情報を使う環境では、両方とも未設定にします）`,
    )
  }

  if (clientEmail !== undefined && privateKey !== undefined) {
    if (projectId === undefined) {
      throw new Error(
        `[gantt] ${ENV_PROJECT_ID} が設定されていません。${ENV_CLIENT_EMAIL} と ${ENV_PRIVATE_KEY} と合わせて 3 つとも設定してください`,
      )
    }
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: restoreLineBreaks(privateKey),
      }),
      projectId,
    })
  }

  return initializeApp({
    credential: applicationDefault(),
    ...(projectId !== undefined && { projectId }),
  })
}

/**
 * Firestore のクライアントを返す。**最初に呼ばれたときに** Admin SDK を初期化する。
 *
 * モジュールの読み込み時には初期化しない。`pnpm build` は Route Handler のモジュールを読み込むため、
 * トップレベルで初期化すると、環境変数のないビルドが失敗する。
 * 開発サーバーの再読み込みで同じプロセスにモジュールが複数回読み込まれても、
 * 初期化済みのアプリを使い回す（二重に初期化するとエラーになるため）。
 *
 * @throws Error 認証情報が不足している、または不正なとき（接続の失敗は最初の読み書きで起きる）
 */
export function getFirestoreClient(): Firestore {
  const app = getApps()[0] ?? createApp()
  return getFirestore(app)
}
