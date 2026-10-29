# フェーズ 4: 日付と座標の計算処理

- 全体プラン: [1-gantt-chart-mvp.md](1-gantt-chart-mvp.md)
- 担当: Sonnet 5.5
- ブランチ: `feat/gantt-utils`
- 前提: フェーズ 3 が完了している（型を使うため）

## 目的

タイムラインの描画と帯のドラッグで使う計算を、UI から切り離した純粋な関数として作り、テストで固める。画面のバグの多くはここで防ぐ。

## 作業内容

### 1. 定数の追加（`gantt.constants.ts`）

- `DAY_COLUMN_WIDTH = 32`（1 日の列幅 px）
- `MEMBER_ROW_HEIGHT` / `PROJECT_ROW_HEIGHT`
- `DEFAULT_RANGE_DAYS_BEFORE = 7` / `DEFAULT_RANGE_DAYS = 60`（初期表示は「今日の 1 週間前から 2 か月分」）
- `RANGE_SHIFT_DAYS`（前後への移動ボタンで動かす日数。例: 14 日）
- `DRAG_THRESHOLD_PX = 4`（これより小さい移動はクリックとみなす）

### 2. 日付の関数（`gantt.utils.ts`）

date-fns を使い、すべて `TDateString` を受け取って `TDateString` を返す。`Date` は関数の内側だけで扱う。

| 関数 | 内容 |
| --- | --- |
| `toDateString(date)` / `parseDateString(value)` | `Date` との相互変換。ローカル時刻で扱い、タイムゾーンのずれを防ぐ |
| `getToday()` | 今日の日付 |
| `addDays(value, days)` | 日数の加算 |
| `diffInDays(from, to)` | 2 つの日付の差（日数） |
| `getDateRange(start, days)` | 表示期間の日付の配列 |
| `isWeekend(value)` / `isHoliday(value)` / `getHolidayName(value)` | 土日・祝日の判定（`@holiday-jp/holiday_jp` を使う） |
| `isRangeOverlapping(projectStart, projectEnd, rangeStart, rangeEnd)` | 案件が表示期間に入っているか |

### 3. 座標の関数（`gantt.utils.ts`）

| 関数 | 内容 |
| --- | --- |
| `getBarLayout(project, rangeStart, rangeDays)` | 帯の `left` と `width`（px）。表示期間の外にはみ出す部分は切り詰め、左右どちらが切れているかも返す（帯の端の見た目を変えるため） |
| `getTodayOffset(rangeStart, rangeDays)` | 今日の線の位置。表示期間の外なら `null` |
| `pxToDays(deltaPx)` | ドラッグの移動量 → 日数（四捨五入で 1 日単位に吸着） |
| `moveProjectDates(project, days)` | 期間を保ったまま移動した後の開始日・終了日 |
| `resizeProjectDates(project, edge, days)` | 左右の端を動かした後の開始日・終了日。開始日 ≦ 終了日を保つ（最短 1 日） |

### 4. テスト（`gantt.utils.test.ts`）

- 月またぎ・年またぎ・うるう年（2028-02-29）
- 1 日だけの案件（開始日 = 終了日）の帯の幅が 1 列分になる
- 表示期間の左右にはみ出す案件、まったく入らない案件
- 祝日（元日・振替休日）の判定
- 伸縮で開始日が終了日を追い越さない
- `pxToDays` の境界（列幅の半分ちょうど、マイナス方向）

## 完了条件

- [ ] 上のテストがすべて通る
- [ ] `pnpm lint` / `pnpm typecheck` / `pnpm test` が成功する

## コミットの単位（目安）

1. `feat: 日付と帯の位置を計算する関数を追加`
