import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import { isAuthorized, isSafeEqual, parseBasicAuthHeader, proxy } from "@/proxy"

/** テスト用に Authorization ヘッダーの値を作る（UTF-8 を base64 化する） */
function encodeBasic(text: string): string {
  return `Basic ${Buffer.from(text, "utf-8").toString("base64")}`
}

describe("parseBasicAuthHeader", () => {
  it("ID とパスワードを取り出せる", () => {
    expect(parseBasicAuthHeader(encodeBasic("alice:secret"))).toEqual({
      user: "alice",
      password: "secret",
    })
  })

  it("パスワードにコロンが含まれていても最初のコロンで分割する", () => {
    expect(parseBasicAuthHeader(encodeBasic("alice:pa:ss"))).toEqual({
      user: "alice",
      password: "pa:ss",
    })
  })

  it("日本語（UTF-8）を正しく読める", () => {
    expect(parseBasicAuthHeader(encodeBasic("太郎:パスワード"))).toEqual({
      user: "太郎",
      password: "パスワード",
    })
  })

  it("パスワードが空でも読める", () => {
    expect(parseBasicAuthHeader(encodeBasic("alice:"))).toEqual({
      user: "alice",
      password: "",
    })
  })

  it("スキームの大文字小文字は区別しない", () => {
    const header = encodeBasic("a:b").replace("Basic", "basic")
    expect(parseBasicAuthHeader(header)).toEqual({ user: "a", password: "b" })
  })

  it.each([
    ["ヘッダーなし", null],
    ["空文字", ""],
    ["Bearer", "Bearer abc"],
    ["資格情報なし", "Basic"],
    ["base64 が不正", "Basic !!!"],
    ["コロンなし", encodeBasic("alice")],
    [
      "UTF-8 として不正",
      `Basic ${Buffer.from([0xff, 0x3a, 0xfe]).toString("base64")}`,
    ],
  ])("不正な入力は null を返す: %s", (_label, header) => {
    expect(parseBasicAuthHeader(header)).toBeNull()
  })
})

describe("isSafeEqual", () => {
  it("同じ文字列は true", () => {
    expect(isSafeEqual("secret", "secret")).toBe(true)
  })

  it("空文字どうしは true", () => {
    expect(isSafeEqual("", "")).toBe(true)
  })

  it("内容が違えば false", () => {
    expect(isSafeEqual("secret", "secreT")).toBe(false)
  })

  it("一方が他方の接頭辞でも false", () => {
    expect(isSafeEqual("secret", "secret1")).toBe(false)
    expect(isSafeEqual("secret1", "secret")).toBe(false)
  })

  it("空文字と非空は false", () => {
    expect(isSafeEqual("", "a")).toBe(false)
  })
})

describe("isAuthorized", () => {
  const expected = { user: "alice", password: "secret" }

  it("ID とパスワードが一致すれば true", () => {
    expect(isAuthorized({ user: "alice", password: "secret" }, expected)).toBe(
      true,
    )
  })

  it("パスワードが違えば false", () => {
    expect(isAuthorized({ user: "alice", password: "wrong" }, expected)).toBe(
      false,
    )
  })

  it("ID が違えば false", () => {
    expect(isAuthorized({ user: "bob", password: "secret" }, expected)).toBe(
      false,
    )
  })

  it("資格情報がなければ false", () => {
    expect(isAuthorized(null, expected)).toBe(false)
  })
})

describe("proxy", () => {
  /** テスト用のリクエストを作る。header を渡すと Authorization ヘッダーを付ける */
  function createRequest(authorization?: string): NextRequest {
    return new NextRequest("http://localhost:3000/", {
      headers: authorization ? { authorization } : {},
    })
  }

  /** NextResponse.next()（通す）かどうかを、専用ヘッダーで判定する */
  function isPassedThrough(response: Response): boolean {
    return response.headers.get("x-middleware-next") === "1"
  }

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe("環境変数が未設定のとき", () => {
    it("開発環境では認証を省略して通す", () => {
      vi.stubEnv("NODE_ENV", "development")
      vi.stubEnv("BASIC_AUTH_USER", "")
      vi.stubEnv("BASIC_AUTH_PASSWORD", "")

      expect(isPassedThrough(proxy(createRequest()))).toBe(true)
    })

    it("本番環境ではすべて拒否する（資格情報があっても 401）", () => {
      vi.stubEnv("NODE_ENV", "production")
      vi.stubEnv("BASIC_AUTH_USER", "")
      vi.stubEnv("BASIC_AUTH_PASSWORD", "")

      const response = proxy(createRequest(encodeBasic(":")))
      expect(response.status).toBe(401)
    })

    it("ID だけ設定されている場合も未設定として扱う", () => {
      vi.stubEnv("NODE_ENV", "production")
      vi.stubEnv("BASIC_AUTH_USER", "alice")
      vi.stubEnv("BASIC_AUTH_PASSWORD", "")

      expect(proxy(createRequest(encodeBasic("alice:"))).status).toBe(401)
    })
  })

  describe("環境変数が設定されているとき", () => {
    function stubCredentials() {
      vi.stubEnv("NODE_ENV", "production")
      vi.stubEnv("BASIC_AUTH_USER", "alice")
      vi.stubEnv("BASIC_AUTH_PASSWORD", "secret")
    }

    it("資格情報が一致すれば通す", () => {
      stubCredentials()
      expect(
        isPassedThrough(proxy(createRequest(encodeBasic("alice:secret")))),
      ).toBe(true)
    })

    it("資格情報が違えば 401 と WWW-Authenticate を返す", () => {
      stubCredentials()
      const response = proxy(createRequest(encodeBasic("alice:wrong")))

      expect(response.status).toBe(401)
      expect(response.headers.get("www-authenticate")).toBe(
        'Basic realm="gantt-chart", charset="UTF-8"',
      )
    })

    it("Authorization ヘッダーがなければ 401 を返す", () => {
      stubCredentials()
      expect(proxy(createRequest()).status).toBe(401)
    })

    it("開発環境でも、環境変数が設定されていれば認証をかける", () => {
      stubCredentials()
      vi.stubEnv("NODE_ENV", "development")

      expect(proxy(createRequest()).status).toBe(401)
    })
  })
})
