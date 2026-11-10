/** catch で受けた unknown を Error にそろえる（Error 以外が投げられたときは文字列化して包む） */
export function toError(caught: unknown): Error {
  return caught instanceof Error ? caught : new Error(String(caught))
}
