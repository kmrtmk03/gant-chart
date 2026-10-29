import { defineConfig, globalIgnores } from "eslint/config"
import prettier from "eslint-config-prettier"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { rules: { "@typescript-eslint/no-explicit-any": "error" } },
  // 整形ルールが Prettier とぶつからないよう、必ず最後に置く
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
])

export default eslintConfig
