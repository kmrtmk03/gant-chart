import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// MEMO: proxy は他のモジュールに依存しない方がよい（Next.js のドキュメントより）ため、
// 認証に必要な関数はすべてこのファイルの中で完結させている。

/** 認証失敗時に返す WWW-Authenticate ヘッダーの値 */
const WWW_AUTHENTICATE_VALUE = 'Basic realm="gantt-chart", charset="UTF-8"'

/** Basic 認証の資格情報（ID とパスワード） */
interface IBasicCredentials {
  user: string
  password: string
}

/**
 * Authorization ヘッダーを解析して ID とパスワードを取り出す。
 * ヘッダーがない・形式が違う・base64 が不正・コロンがない場合は null を返す。
 * パスワードにコロンが含まれていてもよいように、最初のコロンで分割する。
 */
export function parseBasicAuthHeader(
  header: string | null,
): IBasicCredentials | null {
  if (header === null) return null

  const match = /^Basic\s+(\S+)$/i.exec(header)
  const encoded = match?.[1]
  if (encoded === undefined) return null

  let decoded: string
  try {
    // atob はバイト列を 1 文字ずつの文字列にするため、UTF-8 として読み直す
    const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0))
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return null
  }

  const separatorIndex = decoded.indexOf(":")
  if (separatorIndex < 0) return null

  return {
    user: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  }
}

/**
 * 2 つの文字列を、一致するまでの時間が内容に依存しない形で比較する（タイミング攻撃対策）。
 * 長さが違う場合も、長い方の長さ分だけ必ず比較してから結果を返す。
 */
export function isSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const bytesA = encoder.encode(a)
  const bytesB = encoder.encode(b)
  const length = Math.max(bytesA.length, bytesB.length)

  // 長さの違いを最初の差分として織り込み、以降は全バイトを必ず比較する
  let difference = bytesA.length ^ bytesB.length
  for (let index = 0; index < length; index++) {
    difference |= (bytesA[index] ?? 0) ^ (bytesB[index] ?? 0)
  }
  return difference === 0
}

/**
 * 受け取った資格情報が、期待する ID とパスワードに一致するかを判定する。
 * ID とパスワードの比較結果を別々に評価せず、両方比較してから結合する。
 */
export function isAuthorized(
  credentials: IBasicCredentials | null,
  expected: IBasicCredentials,
): boolean {
  if (credentials === null) return false

  const isUserMatched = isSafeEqual(credentials.user, expected.user)
  const isPasswordMatched = isSafeEqual(credentials.password, expected.password)
  return isUserMatched && isPasswordMatched
}

/** 401 を返す。ブラウザに認証ダイアログを出させる。 */
function createUnauthorizedResponse(): NextResponse {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": WWW_AUTHENTICATE_VALUE },
  })
}

/**
 * 全リクエストに Basic 認証をかける。
 * 環境変数 BASIC_AUTH_USER / BASIC_AUTH_PASSWORD が未設定の場合:
 *   - 開発環境: 認証を省略して通す（ローカルでの作業を楽にするため）
 *   - それ以外: すべて拒否する（設定し忘れて公開してしまうのを防ぐため）
 */
export function proxy(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER
  const password = process.env.BASIC_AUTH_PASSWORD

  if (!user || !password) {
    if (process.env.NODE_ENV === "development") return NextResponse.next()
    return createUnauthorizedResponse()
  }

  const credentials = parseBasicAuthHeader(request.headers.get("authorization"))
  if (!isAuthorized(credentials, { user, password })) {
    return createUnauthorizedResponse()
  }

  return NextResponse.next()
}

export const config = {
  // 静的ファイルと favicon は認証の対象外にする
  // MEMO: manifest.webmanifest / sw.js / アイコンは除外しない。
  //       ブラウザは同じオリジンで資格情報を使い回すため、除外しなくてもインストールできる想定。
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
