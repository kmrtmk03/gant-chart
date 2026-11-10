# 15. Firebase（Firestore）連携 実装指示書

localStorage に保存しているデータを Firestore に移し、**ブラウザや端末が違っても同じデータを見て編集できる**ようにする。
この文書は、実装を担当する AI エージェント（Claude Opus 5.5 / Sonnet 5.5 / Codex）に向けた指示書。全体の設計と、フェーズ 13〜17 の作業内容・完了条件をまとめる。

- 作成: 2026-11-10（Claude Fable 5.2。`develop` の `680819f` 時点のコードを調べて書いた）
- 状態: **0 章の確認事項は回答済み（2026-11-10）。実装は、フェーズごとにオーナーの開始の合意を取ってから始める**
- 前提の資料: [handoff.md](handoff.md) / [1-gantt-chart-mvp.md](1-gantt-chart-mvp.md) の 2 章・3 章 / [14-firestore-migration-todo.md](14-firestore-migration-todo.md) / [docs/features/01-data-layer.md](../docs/features/01-data-layer.md)

---

## 0. オーナーに確認した事項と決定（2026-11-10）

Q2・Q3・Q7 はオーナーが回答した。Q1・Q4・Q5・Q6 は明示の回答がなく、当初の推奨のまま進める前提にしている（違っていれば、該当フェーズの開始前に指摘をもらう）。

| # | 確認したこと | 決定 | 影響するフェーズ |
| --- | --- | --- | --- |
| Q1 | ホスティング先（Vercel / Firebase App Hosting / その他） | 推奨のまま: どちらでも動く作りにする（3.3 節）。決まったら、その手順だけ README に書く | 13・17 |
| Q2 | Firebase プロジェクトは作成済みか | **回答: 作成済み**。残りの準備（データベース・鍵・ルール）は 5 章の「オーナーの作業」で確かめる | 13 |
| Q3 | ローカル開発と自動テストに Firestore エミュレーターを使うか | **回答: 使わない（導入しない）**。身内利用で、開発後の更新予定もないため、開発中も本番の Firestore を直接使ってよい。必要になったらオーナーに相談する。**エミュレーターの設定・スクリプト・Java の導入を足さない**。自動テストは同じプロジェクトのテスト専用コレクションで行う（3.9 節） | 13・14・15 |
| Q4 | 他の人の変更を画面に反映する方法 | 推奨のまま: ウィンドウに戻ったときの再取得 + ヘッダーの「更新」ボタン。定期的な自動更新はしない（4.3 節。読み取り回数が無料枠を超えないようにするため） | 16 |
| Q5 | 同時編集の競合検知（issue #24）を今回の範囲に入れるか | 推奨のまま: 入れる（フェーズ 16）。複数人で使い始めると実際に起きるため | 16 |
| Q6 | 今の localStorage のデータを Firestore に取り込む手段が要るか | 推奨のまま: 不要（サンプルデータの入れ直しで足りる想定）。要るなら開発用の取り込みボタンをフェーズ 17 に足す | 17 |
| Q7 | メモの文字数の上限（今は無制限） | **回答: 200 文字**。画面とサーバーの両方で検証する（3.6 節） | 14・15 |

---

## 1. 目的と範囲

### やること

- Route Handler + Firebase Admin SDK で、サーバー側からだけ Firestore を読み書きする
- 画面側は `IGanttRepository` を実装した `ApiRepository`（`fetch`）に差し替える。コンポーネントとフックは repository の中身を知らないまま
- 複数人・複数タブで使えるように、競合検知と再取得を入れる（issue #24）
- ローカル開発は、Firebase なしでも今までどおり localStorage で動くようにする

### やらないこと

- ユーザー認証（Firebase Authentication）。認証は Basic 認証のまま
- **クライアントから Firestore に直接アクセスすること**（`firebase` パッケージ = クライアント SDK は入れない）。リアルタイム購読もこの制約のため行わない
- オフライン時の編集と同期
- 画面の見た目・操作の変更（エラー表示と「更新」ボタンの追加を除く）

---

## 2. 現状（調査済み。再調査しなくてよい）

- 窓口は `IGanttRepository`（`repositories/ganttRepository.type.ts`）。メソッドは 10 個で、すべて Promise を返す
  `listMembers` / `createMember` / `updateMember` / `reorderMembers` / `deleteMember` / `listProjects` / `createProject` / `updateProject` / `reorderProjects` / `deleteProject`
- 実装は `LocalStorageRepository` だけ。生成は `createGanttRepository()` の 1 か所で、`useGanttPage.ts` の先頭（モジュールのトップレベル）で 1 回だけ呼ばれる
- **業務ルールが `localStorageRepository.ts` の中の非公開関数にある**。Firestore 版でも同じルールが要る
  - `getNextSortOrder`（一番下に足すときの番号）/ `filterProjectsOfMember` / `resolveCompletedAt`（完了日時の決め方）/ `validateMember` / `validateProject` / `getCurrentDateTime`
  - 並び替えの検証（重複・不足・別の担当者の案件）は `reorderMembers` / `reorderProjects` の本体に直接書いてある
- エラーは `ganttRepository.errors.ts` の 4 種類（`GanttNotFoundError` / `GanttValidationError` / `GanttUnsupportedSchemaError` / `GanttCorruptedDataError`）。画面側は種類で分岐しておらず、`message` をそのまま出している（`instanceof` の使用箇所はない）
- フックは「保存が成功してから state を更新する」作り（楽観的更新ではない）。保存中の見た目はすでにある（帯の `savingPeriod`、並び替えの `displayIds`、パネルの `runWhileBusy`）。通信が遅くなっても破綻しない想定だが、**遅い保存は今まで再現できず未確認**（handoff の 4-00000 章）
- Basic 認証は `src/proxy.ts`。`matcher` の除外に `/api` は含まれないので、**`/api/*` にもそのまま Basic 認証がかかる**。開発環境で環境変数が未設定のときは認証を省略する
- `next.config.ts` で `cacheComponents: true`。**GET の Route Handler はページと同じ扱いで、ビルド時にプリレンダリングされうる**（`node_modules/next/dist/docs/01-app/01-getting-started/` の route-handlers の「With Cache Components」、`02-guides/migrating-to-cache-components.md` の「Route Handlers (GET)」で確認）
- `firebase-admin` の最新は 14.5.0（Node 22 以上。このプロジェクトは Node 24）。Next.js が自動で外部パッケージ扱いにする一覧に含まれているため、`serverExternalPackages` の設定は不要（`03-api-reference/05-config/01-next-config-js/serverExternalPackages.md`）
- テストは Vitest の node 環境。localStorage は Storage のモックを渡してテストしている（jsdom なし）。現在 283 件前後

---

## 3. 設計

### 3.1 全体の構成

```
画面（コンポーネント）
  └─ フック（useMembers / useProjects …）
        └─ IGanttRepository
              ├─ LocalStorageRepository      … 今までどおり（Firebase なしの開発用）
              └─ ApiRepository               … fetch で /api/gantt/* を呼ぶ【新規】
                                                   │ HTTP（Basic 認証つき・同一オリジン）
                    src/app/api/gantt/**/route.ts … リクエストの検証とエラーの変換だけ【新規】
                                                   │
                    FirestoreGanttRepository     … IGanttRepository のサーバー側の実装【新規】
                                                   │ Firebase Admin SDK
                                                Firestore
```

- **サーバー側の実装も `IGanttRepository` を実装する**。Route Handler は「body を検証 → repository を呼ぶ → JSON で返す」だけの薄い層にする。契約（どんなときにどのエラーを投げるか）を localStorage 版とそろえられ、同じ観点のテストを使い回せる
- 業務ルールは純粋関数に切り出して、localStorage 版と Firestore 版の両方から使う（フェーズ 13 のリファクタリング）

### 3.2 ファイルの置き場所

```
src/
├── app/api/gantt/
│   ├── members/route.ts                      # GET（一覧）/ POST（追加）
│   ├── members/order/route.ts                # PUT（並び替え）
│   ├── members/[id]/route.ts                 # PATCH（名前変更）/ DELETE（削除）
│   ├── members/[id]/projects/order/route.ts  # PUT（担当者の中の案件の並び替え）
│   ├── projects/route.ts                     # GET / POST
│   └── projects/[id]/route.ts                # PATCH / DELETE
└── features/gantt/
    ├── repositories/
    │   ├── ganttRepository.utils.ts          # 業務ルールの純粋関数（localStorage 版から切り出す）
    │   ├── ganttRepository.utils.test.ts
    │   ├── apiRepository.ts                  # fetch 版（クライアント）
    │   ├── apiRepository.test.ts
    │   └── ganttApi.type.ts                  # API のエラー応答などの型（クライアントとサーバーで共有）
    └── server/                               # サーバー専用。クライアントから import しない
        ├── firebaseAdmin.ts                  # Admin SDK の初期化（遅延）
        ├── firestoreGanttRepository.ts
        ├── firestoreGanttRepository.test.ts  # 実際の Firestore のテスト専用コレクションを使う結合テスト（3.9 節）
        ├── ganttApi.utils.ts                 # body の読み取り・エラー → Response の変換・Origin の確認
        └── ganttApi.utils.test.ts
```

- 機能に固有の実装なので `features/gantt/` の中に置く（AGENTS.md の配置の規約）。`src/app/api/` には `route.ts` だけを置く
- Route Handler の `[id]` の受け取り方（`params` は Promise、`RouteContext<'/api/gantt/members/[id]'>` で型を付けられる）は、`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` を読んでから書く
- `members/order` は静的なセグメントなので `[id]` より優先される。id は UUID なので `order` と衝突しない

### 3.3 Firebase Admin SDK の初期化（`server/firebaseAdmin.ts`）

- **モジュールの読み込み時に初期化しない。最初に使うときに初期化する関数（`getFirestoreClient()` のような名前）にする**。`pnpm build` は Route Handler のモジュールを読み込むため、トップレベルで初期化すると、環境変数のないビルドが失敗する
- `getApps()` で初期化済みかを確かめ、二重に初期化しない（開発サーバーの再読み込みで同じプロセスに複数回読み込まれるため）
- 認証情報の選び方
  1. `FIREBASE_CLIENT_EMAIL` と `FIREBASE_PRIVATE_KEY` があれば、`FIREBASE_PROJECT_ID` と合わせてサービスアカウントで初期化する（Vercel など）。秘密鍵は環境変数で改行が `\n` の 2 文字になるので、実際の改行に戻す
  2. なければ、アプリケーションのデフォルト認証情報で初期化する（Firebase App Hosting / Cloud Run）
- エミュレーターは使わない（Q3）。ローカル開発（`.env.local`）も本番と同じ Firebase プロジェクトにつなぐ
- ファイルの先頭に `import "server-only"` を書き、クライアントのバンドルに入ったらビルドで失敗するようにする（`02-guides/data-security.md`）。lint / typecheck が通らないときだけ `pnpm add server-only` を入れる
  - **注意**: Vitest では `server-only` の import が例外になることがある。`import "server-only"` は `firebaseAdmin.ts` と `route.ts` にだけ書き、テスト対象の `firestoreGanttRepository.ts` は Firestore のインスタンスをコンストラクタで受け取る形にして、直接 import しない
- 環境変数（**どれにも `NEXT_PUBLIC_` を付けない**。`.env.example` に空のひな形と説明を足す）

| 変数 | 用途 |
| --- | --- |
| `FIREBASE_PROJECT_ID` | プロジェクト ID |
| `FIREBASE_CLIENT_EMAIL` | サービスアカウントのメールアドレス（ADC を使う環境では不要） |
| `FIREBASE_PRIVATE_KEY` | サービスアカウントの秘密鍵（同上） |
| `GANTT_FIRESTORE_TEST` | `1` のときだけ結合テストを動かす（`pnpm test:firestore` が付ける。3.9 節） |

- API は、記憶ではなく導入後の型定義（`node_modules/firebase-admin/lib/` の `app` / `firestore` の `.d.ts`）で確かめてから使う。import は `firebase-admin/app` と `firebase-admin/firestore` のモジュール形式

### 3.4 Firestore のデータ

- コレクションは `members` と `projects` の 2 つ（全体プラン 2 章のとおり）。ドキュメント ID = `id`（サーバーで `crypto.randomUUID()`）
- ドキュメントのフィールドは `IMember` / `IProject` から `id` を除いたもの。読むときは `{ id: doc.id, ...doc.data() }` を **`unknown` として `isMember` / `isProject` に通してから**返す（1 件でも不正なら空として扱わず、エラーにする。localStorage 版の `GanttCorruptedDataError` と同じ考え方）
- **日付・日時は文字列のまま保存する**（`"YYYY-MM-DD"` と ISO 8601）。Firestore の `Timestamp` 型は使わない
- 一覧の並び: `listMembers` は `sortOrder` の昇順。`listProjects` は `createdAt` の昇順（localStorage 版の「保存順」に合わせる。画面は `groupProjectsByMember` が並べ直すので順に依存していない）
- 複合インデックスが要るクエリは書かない（`memberId` の等価条件だけで取り、並べ替えはサーバーのコードで行う）。件数は身内利用で数百件までの想定
- スキーマのバージョン: **Firestore にはバージョンを持たせない**。Firestore のデータは今の構造（バージョン 3 相当）から始まる。`CURRENT_SCHEMA_VERSION` と移行処理は localStorage 版だけのものとして残す。構造を変えるときは一度きりの移行スクリプトで対応する（`MEMO:` を `firestoreGanttRepository.ts` に残す）
- Security Rules は**すべて拒否**。`firestore.rules` をリポジトリに置く（Admin SDK はルールの対象外なので、アプリは動く）

### 3.5 各操作のトランザクション

読んでから書く操作は、**すべて Firestore のトランザクションの中で行う**（同時に 2 人が操作しても、番号の重複や取りこぼしが起きないようにするため）。

| 操作 | トランザクションの中で読むもの | 書くもの |
| --- | --- | --- |
| `createMember` | 全担当者（次の `sortOrder` を決める） | 新しい担当者 |
| `updateMember` | その担当者（なければ NotFound） | その担当者 |
| `reorderMembers` | 全担当者（過不足・重複を検証） | 順番が変わった担当者だけ |
| `deleteMember` | その担当者、その担当者の全案件 | 担当者と配下の案件をまとめて削除 |
| `createProject` | 担当者（なければ NotFound）、その担当者の全案件 | 新しい案件 |
| `updateProject` | その案件。担当者を付け替えるときは、付け替え先の担当者と全案件 | その案件 |
| `reorderProjects` | 担当者、その担当者の全案件 | 順番が変わった案件だけ |
| `deleteProject` | その案件（なければ NotFound） | 削除 |

- 値の決め方（`sortOrder`・`completedAt`・`updatedAt`・拾い直すフィールド）と検証は、`ganttRepository.utils.ts` の関数を使い、localStorage 版と結果をそろえる。「順番が変わらないものは `updatedAt` も変えない」も同じ
- トランザクションはすべての読み取りを書き込みより先に行う必要がある。クエリをトランザクションの中で読む書き方と、1 回のトランザクションで書ける件数の上限は、Admin SDK の型定義と公式ドキュメントで確かめる

### 3.6 API

すべて JSON。成功時の body は repository の戻り値そのまま。

| メソッドとパス | body | 成功 | 対応するメソッド |
| --- | --- | --- | --- |
| `GET /api/gantt/members` | — | 200 `IMember[]` | `listMembers` |
| `POST /api/gantt/members` | `{ name }` | 201 `IMember` | `createMember` |
| `PATCH /api/gantt/members/[id]` | `{ name? }` | 200 `IMember` | `updateMember` |
| `PUT /api/gantt/members/order` | `{ orderedIds }` | 200 `IMember[]` | `reorderMembers` |
| `DELETE /api/gantt/members/[id]` | — | 204 | `deleteMember` |
| `GET /api/gantt/projects` | — | 200 `IProject[]` | `listProjects` |
| `POST /api/gantt/projects` | `TProjectInput` | 201 `IProject` | `createProject` |
| `PATCH /api/gantt/projects/[id]` | `TProjectUpdate` | 200 `IProject` | `updateProject` |
| `PUT /api/gantt/members/[id]/projects/order` | `{ orderedIds }` | 200 `IProject[]` | `reorderProjects` |
| `DELETE /api/gantt/projects/[id]` | — | 204 | `deleteProject` |

エラーの応答は 1 つの形にそろえる（型は `ganttApi.type.ts`）。

```ts
interface IGanttApiErrorBody {
  error: {
    code: "validation" | "not_found" | "conflict" | "forbidden" | "internal"
    message: string // 画面にそのまま出せる日本語
    entity?: "member" | "project" // not_found のとき
    id?: string // not_found のとき
  }
}
```

| 状況 | ステータス | code |
| --- | --- | --- |
| body が JSON でない・形が違う・`GanttValidationError` | 400 | `validation` |
| Origin が違う（下記） | 403 | `forbidden` |
| `GanttNotFoundError` | 404 | `not_found` |
| 競合（フェーズ 16） | 409 | `conflict` |
| それ以外（Firestore の障害・設定の不足など） | 500 | `internal` |

Route Handler で守ること。

- **body は `unknown` で受け、型ガードで検証してから repository に渡す**。入力用のガード（`isMemberInput` / `isMemberUpdate` / `isProjectInput` / `isProjectUpdate` / `isOrderedIds`）を足す。置き場所は、クライアントでも使うなら `gantt.guards.ts`、サーバーだけなら `server/ganttApi.utils.ts`
- **文字数の上限をサーバーでも検証する**（`MEMBER_NAME_MAX_LENGTH` / `PROJECT_NAME_MAX_LENGTH` と、メモの上限 **200 文字** = Q7。定数 `PROJECT_NOTE_MAX_LENGTH` を `gantt.constants.ts` に足す）。今は「名前の必須・文字数は画面側の責務」だが、API は画面を通さずに呼べるため。必須チェック（前後の空白を除いて空）もサーバーで行う。検証は `ganttRepository.utils.ts` の validate に足し、localStorage 版にも同じく効かせてよい（既存のテストが変わる場合は、理由を PR に書く）
  - メモの上限は画面でも検証する: `projectForm.utils.ts` の `validateProjectForm` に足し、案件名と同じ形でメモの欄の下にエラーを出す（テストを書く）。文字数の数え方は案件名の検証（`name.length`）にそろえる
  - **文字数の上限は「書き込むとき」だけ検証し、読み込みの型ガード（`isProject` / `isMember`）には足さない**。上限より長いメモがすでに保存されていても（localStorage の既存データなど）、一覧の読み込みを失敗させないため。その案件を編集して保存するときに、200 文字以内に直してもらう
- **GET では最初に `await connection()`（`next/server`）を呼ぶ**。`cacheComponents` が有効なので、ビルド時のプリレンダリングで Firestore に接続しにいかないようにする（`03-api-reference/04-functions/connection.md`）。`pnpm build` の出力で `/api/gantt/*` が動的（`ƒ`）になっていること、Firebase の環境変数なしでビルドが通ることを確かめる
- 応答に `Cache-Control: no-store` を付ける
- **書き込み系（POST / PATCH / PUT / DELETE）では、リクエストの `Origin` ヘッダーがあれば、そのホストがリクエスト先のホストと一致することを確かめる**（不一致は 403）。Basic 認証はブラウザが自動で資格情報を付けるため、他のサイトから書き込みを送られる攻撃（CSRF）を防ぐ必要がある
- 500 のときは、エラーの詳細（スタックや Firebase のメッセージ）をサーバーのログ（`console.error`）にだけ出し、応答には一般的な文言だけを返す
- 共通の処理（body の読み取り、エラー → Response の変換、Origin の確認）は `server/ganttApi.utils.ts` にまとめ、各 `route.ts` は数行にする

### 3.7 `ApiRepository`（クライアント）

- `fetch` をコンストラクタで受け取れるようにし（省略時はグローバルの `fetch`）、テストではモックを渡す（`LocalStorageRepository` が Storage を受け取るのと同じ形）
- `fetch` は `cache: "no-store"`。同一オリジンなので、Basic 認証の資格情報はブラウザが自動で付ける
- 成功の応答は `unknown` で受け、`isMember` / `isMemberList` / `isProject` / `isProjectList` で検証してから返す
- エラーの応答は `code` を見て元のエラーに戻す: `not_found` → `GanttNotFoundError`、`validation` → `GanttValidationError`、`conflict` → `GanttConflictError`（フェーズ 16）。それ以外・応答の形が不正・通信の失敗は、新しい `GanttApiError`（`status` を持つ。`ganttRepository.errors.ts` に追加）にする
  - `GanttApiError` のメッセージは画面にそのまま出るので、「通信に失敗しました。接続を確認して、もう一度お試しください」のように、次の行動が分かる日本語にする
  - 401（Basic 認証が切れた・本番で未設定）も `GanttApiError` で、再読み込みを促す文言にする
- 生成だけならサーバー側でもエラーにならないこと（`useGanttPage.ts` がモジュールのトップレベルで生成するため）

### 3.8 保存先の切り替え

`createGanttRepository()` の中で、環境変数 `NEXT_PUBLIC_GANTT_DATA_SOURCE` を見て決める。

| 値 | 保存先 |
| --- | --- |
| `api` | `ApiRepository`（Firestore） |
| 未設定・`local` | `LocalStorageRepository`（今までどおり） |
| それ以外 | エラーにする（設定の打ち間違いに気づけるように） |

- この値は「どちらの保存先を使うか」の印で、Firebase の設定値や秘密ではないため、`NEXT_PUBLIC_` を付けてよい（AGENTS.md の禁止は Firebase の設定値とサービスアカウント情報が対象）。ビルド時に埋め込まれるので、変えたら再ビルドが要る
- 未設定を `local` にするのは、Firebase の準備がない開発機・CI でも今までどおり動かすため。**本番で設定を忘れると localStorage のまま動いてしまう**ので、README のデプロイ手順に明記する
- 文字列の比較は 1 か所（`createGanttRepository.ts`）だけにし、値は定数にする

### 3.9 開発と自動テストで使う Firestore（エミュレーターなし）

エミュレーターは導入しない（Q3）。ローカル開発も自動テストも、本番と同じ Firebase プロジェクトにつなぐ。

- **ローカル開発（`pnpm dev`）**: `NEXT_PUBLIC_GANTT_DATA_SOURCE=api` にすると、本番と同じ `members` / `projects` を読み書きする。オーナーは「本番のデータを触ってよい」としているが、動作確認で入れたデータは、終わったら残すか消すかをオーナーに聞く
- **自動テスト（`pnpm test:firestore`）**: テストはデータを何度も作って消すので、**実データのコレクションでは動かさない**。同じプロジェクトの中の、テスト専用のコレクションを使う
  - `FirestoreGanttRepository` のコンストラクタで、コレクション名を受け取れるようにする（省略時は `members` / `projects`。既定の名前は `gantt.constants.ts` の定数にする）
  - テストは実行ごとに違う接頭辞を付けたコレクション（例: `test-<ランダムな文字列>-members` / `test-<同じ文字列>-projects`）を使い、終わったらそのコレクションのドキュメントをすべて消す
  - **テストの開始時に、コレクション名が既定値（`members` / `projects`）と違うことを確かめ、同じなら何も書かずにテストを止める**
  - 環境変数 `GANTT_FIRESTORE_TEST=1` がないときは、結合テストを飛ばす（`pnpm test` で誤って Firestore に触らないため）
  - 読み書きの回数は無料枠（1 日に読み取り 5 万回・書き込み 2 万回）に対して小さいが、テストを繰り返し回す前に、1 回の実行でおよそ何回読み書きするかを数えて PR に書く
- エミュレーターが必要になったら（オフラインで開発したい・無料枠が気になるなど）、オーナーに相談してから導入する

---

## 4. 同時編集への対応（issue #24）

[14-firestore-migration-todo.md](14-firestore-migration-todo.md) の「移行時にやること」への回答。フェーズ 16 で実装する。

### 4.1 フォームは変えた項目だけを送る

`useGanttPage.handleSaveProject` は、編集時にフォームの全項目を `updateProject` に渡している。これを**初期値と違う項目だけ**にする（`projectForm.utils.ts` に差分を作る純粋関数を足す。テストを書く）。別の人が変えた別の項目を、古い値で上書きしなくなる。担当者名の変更は項目が 1 つなので対象外。

### 4.2 `updatedAt` の照合（同じ項目を両方で変えたとき）

- `updateMember` / `updateProject` に、省略できる引数を足す

  ```ts
  /** 更新のオプション */
  interface IUpdateOptions {
    /** 編集を始めたときの updatedAt。指定すると、保存先の値と違うときに GanttConflictError を投げる */
    expectedUpdatedAt?: string
  }
  updateProject(id: string, input: TProjectUpdate, options?: IUpdateOptions): Promise<IProject>
  ```

- 照合はサーバーのトランザクションの中で行う（読んだ `updatedAt` と違えば書かずに 409）。API では PATCH の body に `expectedUpdatedAt` を含める。localStorage 版にも同じ照合を入れ、契約をそろえる
- `GanttConflictError`（`ganttRepository.errors.ts` に追加）のメッセージ例: 「ほかの人がこの案件を更新しました。最新の内容を読み込み直してから、もう一度お試しください」
- 画面での扱い
  - **サイドパネル**: パネルを開いた時点の `updatedAt` を覚えておき、保存時に渡す。競合したら、パネルは閉じずにエラーを出し、入力中の内容は残す（下書きを捨てない）。同時に一覧を再取得する。もう一度保存すると、再取得後の `updatedAt` と照合される（= 相手の変更を見たうえでの上書きになる）。4.1 の差分の基準も再取得後の値に更新する
  - **帯のドラッグ**: ドラッグを始めた時点の `updatedAt` を渡す。競合したら帯を元に戻し、左下のお知らせを出して一覧を再取得する（既存の失敗時の流れに乗せる）
  - **完了の切り替え**: サイドパネルの保存と同じ経路なので、同じ扱いになる
- 並び替え（`reorderMembers` / `reorderProjects`）と削除は `updatedAt` を照合しない。並び替えは「全 id を過不足なく渡す」契約のままにし、別の人が増減させていたら既存の `GanttValidationError` になる。**そのとき画面は一覧を再取得し、「一覧が古くなっていたため、最新の内容を読み込みました。もう一度お試しください」と知らせる**
- 担当者の削除の確認に出す「配下の案件 N 件」は、確認ダイアログを開くときに一覧を再取得してから数える

### 4.3 他の人の変更を画面に反映する

クライアントから Firestore を購読しない方針なので、**再取得**で反映する。

- ウィンドウにフォーカスが戻ったとき・タブが表示されたとき（`useTimelineRange.ts` の `subscribeToToday` と同じきっかけ）に、担当者と案件を再取得する。短時間に何度も走らないよう、前回の取得から一定時間（定数。30 秒を目安）は見送る
- ヘッダーに「更新」ボタンを足す（`GanttHeader`。押すと再取得）
- 再取得しないとき: 保存の実行中、帯・並び替えのドラッグ中（手元の表示が途中で変わらないようにする）
- サイドパネルを開いたまま再取得しても、フォームの入力値は変えない（初期値を 1 度だけ決める既存の作りのまま）。編集中の案件が消えていたら、既存の動き（パネルを出さない）になる
- **定期的な自動更新（ポーリング）はしない**。1 回の再取得で全ドキュメントを読むため、たとえば 100 件を 60 秒ごと・5 人・8 時間で 24 万回の読み取りになり、Firestore の無料枠（1 日 5 万回の読み取り）を超える。必要になったら、「変更のたびに番号を進める 1 件のドキュメント」だけを定期的に読む方式を検討する（`MEMO:` を残す）
- 再取得の置き場所は、`useGanttPage` から呼ぶ責務別のフック（`hooks/useDataRefresh.ts` のような名前）にする。`useMembers` / `useProjects` の `reloadMembers` / `reloadProjects` を使う

---

## 5. フェーズ

フェーズは 1 つずつ別のセッションで進め、それぞれ `develop` から作業用ブランチを切って `develop` 宛ての PR を出す。**各フェーズの開始前にオーナーの合意を取り、終わったら [handoff.md](handoff.md) を更新する**（進捗の表に 13〜17 の行を足す）。

| フェーズ | 内容 | 担当 | ブランチ |
| --- | --- | --- | --- |
| 13 | 業務ルールの切り出しと Firebase の土台 | Sonnet 5.5 | `feat/firebase-foundation` |
| 14 | サーバー側の repository（Firestore） | Opus 5.5 | `feat/firestore-repository` |
| 15 | API・`ApiRepository`・保存先の切り替え | Sonnet 5.5 | `feat/gantt-api` |
| 16 | 同時編集への対応（issue #24） | Opus 5.5 | `feat/gantt-conflict-handling` |
| 17 | デプロイの準備・資料の更新・レビュー | Sonnet 5.5 / Codex | `docs/firebase-integration` |

依存関係: 13 → 14 → 15 → 16 → 17。16 は 15 のあとならいつでもよいが、複数人で使い始める前に入れる。

### 共通の約束

- 作業前に `git fetch origin develop` で `develop` の遅れを確かめる（AGENTS.md の手順）
- 各フェーズの終わりに `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm format:check` / `pnpm build` を通す
- **既存のテストを通したまま進める**。期待値を変えるときは、理由を PR の説明に書く
- 秘密（サービスアカウントの鍵・`.env.local`）をコミットしない。ログや PR にも貼らない
- パッケージの追加は `pnpm add` だけを使う

### オーナーの作業（フェーズ 13 の開始までに）

エージェントは Firebase のコンソール操作と秘密鍵の受け渡しを行わない。次はオーナーに依頼する。

1. Firebase プロジェクトは作成済み（Q2）。Firestore（ネイティブモード）のデータベースがまだなければ作る。ロケーションは日本なら `asia-northeast1`（東京）
2. サービスアカウントの鍵を発行し、`FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` を `.env.local` とホスティング先の環境変数に入れる（ADC を使うホスティング先ではプロジェクト ID だけ）
3. Security Rules を「すべて拒否」にする（フェーズ 13 で置く `firestore.rules` をデプロイするか、コンソールで同じ内容を設定する）
4. `.env.local` に入れた値で開発機から Firestore につながることは、フェーズ 13 の完了条件でエージェントが確かめる（つながらなければ、エラーの内容をオーナーに伝える）

### フェーズ 13: 業務ルールの切り出しと Firebase の土台

**目的**: 動きを変えずに、Firestore 版を書ける状態にする。

1. `refactor`: `localStorageRepository.ts` の非公開関数を `repositories/ganttRepository.utils.ts` に切り出す（`getNextSortOrder` / `filterProjectsOfMember` / `resolveCompletedAt` / `validateMember` / `validateProject` / `getCurrentDateTime`）。並び替えの検証と番号の振り直しも、「現在の一覧と `orderedIds` を受け取り、変更後の一覧を返す（不正なら投げる）」純粋関数にして両方から使う。**動きは変えない**。`ganttRepository.utils.test.ts` を足す
2. `feat`: `pnpm add firebase-admin`。`server/firebaseAdmin.ts`（3.3 節）と、`.env.example` のひな形
3. `feat`: `firestore.rules`（すべて拒否）。エミュレーターの設定（`firebase.json` のエミュレーターの項目・起動用のスクリプト）は足さない（Q3）
4. `docs`: README に Firebase の環境変数の説明を足す（ローカル開発も本番の Firestore につながることを明記する）

**完了条件**

- 既存のテストが期待値を変えずにすべて通る
- Firebase の環境変数がない状態で `pnpm build` が通る
- `.env.local` の認証情報で、`firebaseAdmin.ts` 経由でテスト専用コレクション（3.9 節）に 1 件書いて読み、消せることを確かめた（確認用のコードは残さない。**`members` / `projects` には書かない**）

### フェーズ 14: サーバー側の repository（Firestore）

**目的**: `IGanttRepository` を Firestore で実装し、契約を localStorage 版とそろえる。

1. `server/firestoreGanttRepository.ts`（3.4・3.5 節）。Firestore のインスタンスはコンストラクタで受け取る
2. 結合テスト `server/firestoreGanttRepository.test.ts`。実際の Firestore のテスト専用コレクションを使う（3.9 節の約束を守る）
   - **`pnpm test` には含めない**（Firebase の認証情報がない環境でも `pnpm test` が通り、ふだんのテストで Firestore の読み書きの回数を使わないようにする）。`pnpm test:firestore` を足す。分け方（Vitest の設定ファイルを分ける・ファイル名で除外するなど）と、`.env.local` の読み込み方は Vitest のドキュメントで確かめて決める
   - 観点は `localStorageRepository.test.ts` の「担当者」「担当者の並び替え」「案件」「案件の完了」「案件の並び替え」と同じにする（スキーマの移行・Storage の復元は対象外）。できれば、repository を作る関数を受け取る共通のテスト関数にして、両方の実装で同じテストを回す
   - Firestore 版だけの観点: 同時に 2 つ `createProject` を呼んでも `sortOrder` が重複しない / 担当者の削除で配下の案件がすべて消える / 不正な形のドキュメントが 1 件あると一覧がエラーになる
3. テストが途中で失敗してもテスト専用コレクションのドキュメントが残らないよう、後始末を `afterEach` / `afterAll` で行う。残ってしまったときに消す方法（コレクション名の接頭辞）を README に書く

**完了条件**

- `pnpm test:firestore` が通り、`pnpm test` は今までどおり Firebase の認証情報なしで通る。テストの前後で `members` / `projects` の内容が変わっていない
- 10 個のメソッドが、localStorage 版と同じ入力に同じ結果・同じ種類のエラーを返す

### フェーズ 15: API・`ApiRepository`・保存先の切り替え

**目的**: 画面から Firestore を読み書きできるようにする。

1. 入力用の型ガードと、文字数の上限の検証（3.6 節。テストを書く）
2. `server/ganttApi.utils.ts` と 6 つの `route.ts`（3.6 節）
3. `GanttApiError`、`ganttApi.type.ts`、`repositories/apiRepository.ts` とテスト（`fetch` のモックで、成功・各エラー・不正な応答・通信の失敗を確かめる）
4. `createGanttRepository.ts` の切り替え（3.8 節）。ファイルの `MEMO:`（移行の手順）は実態に合わせて書き直す
5. `GanttCorruptedDataError` のメッセージなど、localStorage を前提にした文言が API 利用時に画面へ出ないことを確かめる

**確認（実際の Firestore + `NEXT_PUBLIC_GANTT_DATA_SOURCE=api`。確認で入れたデータは、終わったらオーナーに残すか消すかを聞く）**

- 追加・編集・削除・完了・帯のドラッグ・並び替え・担当者の管理が動き、再読み込みしても残る。別のブラウザでも同じデータが見える
- サンプルデータの投入（開発用）が API 経由でも動く
- 通信を遅くして（開発者ツールの通信速度の制限）、保存中の見た目と二重実行の抑止を確かめる（handoff で未確認だった項目）
- サーバーを止めた状態で操作し、エラーが出て画面が元に戻ることを確かめる
- `curl` で確かめる: Basic 認証なしは 401 / 形の違う body は 400 / 存在しない id は 404 / `Origin` が別のホストの書き込みは 403
- `NEXT_PUBLIC_GANTT_DATA_SOURCE` を外すと、今までどおり localStorage で動く

**完了条件**: 上の確認がすべて済み、`pnpm build` の出力で `/api/gantt/*` が動的になっている。クライアントのバンドルに `firebase-admin` が入っていない（`server-only` でビルドが守られている）

### フェーズ 16: 同時編集への対応

4 章を実装する。コミットは「変えた項目だけを送る」「`updatedAt` の照合（repository・API）」「競合時の画面の扱い」「再取得と更新ボタン」に分ける。

**確認（2 つのブラウザで）**

- [14-firestore-migration-todo.md](14-firestore-migration-todo.md) の再現手順（B で案件名、A でメモ）で、B の変更が失われない
- 同じ項目を両方で変えると、後から保存した側に競合のエラーが出て、入力中の内容が残る
- 片方で追加・削除したあと、もう片方で並び替えると、再取得されて案内が出る
- ウィンドウに戻ると相手の変更が出る。ドラッグ中・保存中は再取得されない

**完了条件**: 上の確認が済み、issue #24 に結果を書いてクローズできる状態になっている（クローズはオーナーの指示で行う）

### フェーズ 17: デプロイの準備・資料の更新・レビュー

1. README: Firebase の準備、環境変数、結合テスト（`pnpm test:firestore`）、デプロイ先での設定（`NEXT_PUBLIC_GANTT_DATA_SOURCE=api` を忘れないこと）
2. `AGENTS.md`: 技術構成（データ保存）、ディレクトリ構成（`server/`・`app/api/`）、コマンド（`test:firestore` など）、データ設計のルール
3. `docs/`: [01-data-layer.md](../docs/features/01-data-layer.md)（構成図・API・エラー・「Firestore への移行の道筋」を実態に）、[overview.md](../docs/overview.md)（層・データの流れ・よくある質問の「共有できますか」「2 つのタブで」）、[08-app-infrastructure.md](../docs/features/08-app-infrastructure.md)（環境変数・Basic 認証と API）、`docs/README.md` の早見表
4. [14-firestore-migration-todo.md](14-firestore-migration-todo.md) に、各項目をどう対応したかを追記する
5. Q6 で取り込みが必要になった場合だけ: 開発用の取り込み（localStorage の `gantt:*` を読み、API で登録する）
6. Codex にレビューを依頼し、指摘は issue にして、オーナーの指示を受けてから対応する
7. 本番（またはプレビュー）環境での確認はオーナーと行う: Basic 認証 → データの読み書き → 2 台での共有

---

## 6. 気をつけること（落とし穴）

- **記憶にある Next.js / Firebase の API を書かない**。Next.js は `node_modules/next/dist/docs/`、Firebase Admin SDK は導入後の型定義で確かめる
- `route.ts` と `server/` のコードを、クライアントのコード（`"use client"` のファイル・フック・`repositories/apiRepository.ts`）から import しない。共有してよいのは型・型ガード・定数・`ganttRepository.utils.ts` の純粋関数だけ
- `ganttRepository.utils.ts` に `firebase-admin` や `window` に依存するコードを入れない（クライアントとサーバーの両方で読み込まれる）
- `proxy.ts` は変更しない。`/api` を `matcher` の除外に足すと、API が無認証で公開される
- Firestore から読んだ値を型アサーション（`as IMember`）で済ませない。必ず型ガードを通す
- **結合テストで `members` / `projects`（実データ）を読み書きしない**。テスト専用コレクションの約束（3.9 節）を守り、コレクション名が既定値のままならテストを止める
- 「保存が成功してから state を更新する」作りは変えない（楽観的更新にしない）。通信の失敗時に画面を戻す処理が要らないままにする
- `devSeed.ts` は repository 経由なので、そのまま動く。本番ビルドでは出ない作りも変えない

---

## 7. この指示書で決めていないこと

- ホスティング先ごとのデプロイ手順の詳細（Q1 の回答後、フェーズ 17 で書く）
- Firestore のバックアップ（身内利用のため今は対象外。必要なら Firebase の機能で設定する）
- 操作の履歴・取り消し
