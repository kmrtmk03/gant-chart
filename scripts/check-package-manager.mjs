// pnpm 以外のパッケージマネージャーでの install を止める。
// preinstall から呼ばれる。ネットワークに依存させないため only-allow は使わず、
// 実行元を示す環境変数 npm_config_user_agent だけで判定する。
const userAgent = process.env.npm_config_user_agent ?? ""

if (!userAgent.startsWith("pnpm/")) {
  console.error("このプロジェクトでは pnpm を使ってください（pnpm install）。")
  process.exit(1)
}
