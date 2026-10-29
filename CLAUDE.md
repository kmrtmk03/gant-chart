# Claude Code 向け設定

共通の規約は `AGENTS.md` にまとめてある。まず次を読み込むこと。

@AGENTS.md

---

以下は Claude Code だけに当てはまる内容。

## skill の使い方

作業内容に対応する skill がある場合は、自己流の手順ではなく必ず skill を使う。

| 場面 | skill |
| --- | --- |
| ファイルの作成・編集・削除を伴う作業全般（着手前） | `dev-workflow` |
| 新しいファイル・関数・型・定数を書くとき | `coding-standards` |
| `.tsx` を書く・フックを設計するとき | `react-standards` |
| 型定義・型ガード・型エラーを扱うとき | `typescript-standards` |
| コミット・ブランチ作成・完了報告 | `git-commit-report` |
| GitHub の issue・PR の操作 | `github-pr-workflow` |

- skill の内容と `AGENTS.md` が矛盾する場合は、`AGENTS.md`（このプロジェクトの規約）を優先する。たとえば Tailwind 向けのスタイル規約は、このプロジェクトでは Sass / CSS Modules の規約に読み替える

## GitHub の操作

- GitHub 上のリソース（issue・PR・コメントなど）の操作は、必ず GitHub MCP サーバーのツール（`mcp__github__*`）を使う。`gh` CLI や API の直接呼び出しは使わない
- ツールが読み込まれていない場合は、先にツール検索で取得する。`gh` に切り替えない
- owner / repo は推測せず、`git remote -v` で確認する
- ローカルの git 操作（commit・branch・diff・push）は通常の `git` コマンドでよい

## プラン作成

- ユーザーから明示的に依頼されたときだけ、プランを作る
- プランは `.plan/{番号}-{プラン名}.md` に Markdown で保存し、ユーザーの承認を得るまで実装を始めない
