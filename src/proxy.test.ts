import { describe, expect, it } from "vitest"

import { isAuthorized, isSafeEqual, parseBasicAuthHeader } from "@/proxy"

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
