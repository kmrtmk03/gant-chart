import type { ComponentPropsWithoutRef } from "react"

import styles from "./Button.module.scss"

type TButtonProps = Omit<ComponentPropsWithoutRef<"button">, "className">

/**
 * 標準の見た目のボタン（枠・背景・余白・ホバー）。
 * `type` を省略すると "button" になる（フォームの送信にしたいときだけ "submit" を渡す）。
 * className は受け取らない。色などを変えたいボタンは、個別のクラスで `styles/_button.scss` の
 * `appearance` を取り込む（このコンポーネントのクラスとの優先順位がクラスの読み込み順で決まってしまうため）。
 * 親側の要素セレクター（例: `.controls button`）で見た目を調整するのは構わない。
 */
export function Button({ type = "button", ...props }: TButtonProps) {
  return <button type={type} className={styles.button} {...props} />
}
