# Notion-to-Static-Website 全面リファクタリング

## TL;DR

> **Quick Summary**: Notion CMS→静的サイト生成プロジェクトの全面リファクタリング。巨大モノリシックファイルの分割、バグ5件の修正、型安全性の改善、コード重複の解消、テストの修復・拡充を一括で実施する。
>
> **Deliverables**:
>
> - `notion.ts` (763行) → 5モジュールに分割 (client, cache, database, page, tags)
> - `NotionBlock.tsx` (731行) → ブロック種別ごとのコンポーネントに分割
> - バグ5件すべて修正 (Footer, OGP, FormattedPage import, pagination, coverImage)
> - PostCardコンポーネントを全ページで統一使用
> - 既存テスト修復 (2ファイルが現在FAIL) + 分割に合わせたテスト再構成
> - 未使用ファイル削除、import パス統一 (`@/` エイリアス)
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 8 → Task 13 → Task 16 → Final

---

## Context

### Original Request

「このプロジェクトわかりにくすぎるし、バグも多いのでリファクタを計画してください」
→ 全面的リファクタリング。バグ修正・構造改善・型安全性・品質すべてを一括で対応。改善もOK。

### Interview Summary

**Key Discussions**:

- 優先順位: 全問題を依存関係順に一括で対応
- スコープ: 全面的リファクタ（制限なし）
- テスト: 既存テスト維持・拡充（tests-after）
- 挙動: 改善もOK（OGP修正、PostCard統一、キャッシュ見直し）

**Research Findings**:

- プロジェクト規模は小さい (src配下17ファイル) が2ファイルが巨大
- 既存テスト5ファイル中2ファイルがFAIL（vi.mockコンストラクタ問題）
- import パスが `@/` と `../` で混在
- `MDXLayout.astro` は全ファイルからゼロ参照（削除安全）
- ビルドはコンパイル成功するが、env変数なし環境では全ページがNotion APIエラー

### Metis Review

**Identified Gaps** (addressed):

- テスト・ビルドのベースライン未確認 → 実行済み: 3 PASS / 2 FAIL, ビルドコンパイル成功
- `coverImage` prop: 使用すべきか削除すべきか不明 → デフォルト: PostCard統一時にthumbnail表示を実装
- キャッシュ方針不明 → デフォルト: dev server向けに維持、冗長チェック削除のみ
- import パス規約不統一 → デフォルト: `@/` エイリアスに統一
- ファイル分割後の循環import → ガードレール: 依存方向を types → client → modules → pages に固定
- `log()` 関数の扱い → デフォルト: コメントアウトを解除し全レベル有効化

---

## Work Objectives

### Core Objective

巨大ファイルを分割して可読性を高め、全バグを修正し、型安全性とコード品質を改善する。リファクタ前後で既存テスト（修復後）がすべてパスし、ビルドが成功すること。

### Concrete Deliverables

- `src/lib/notion/` ディレクトリ: client.ts, cache.ts, database.ts, page.ts, tags.ts, index.ts (barrel)
- `src/components/blocks/` ディレクトリ: 各ブロックコンポーネント + index.ts (barrel)
- 修正済み `PostCard.astro`: coverImage対応、全3ページで使用
- 修正済み `Footer.astro`, `BaseLayout.astro`: props/OGPバグ修正
- 修復済みテスト: `notion.test.ts`, `blogPage.test.tsx` が全PASSに
- 統一されたimportパス: 全ファイル `@/` エイリアス使用

### Definition of Done

- [ ] `pnpm test --run` → ALL PASS (0 failures)
- [ ] `pnpm build` → コンパイル成功 (exit 0)
- [ ] `grep -r "as unknown as" src/lib/` → 0 matches
- [ ] 全ファイルが200行以下 (分割後)
- [ ] `grep -r "from '\.\." src/` → 0 matches (相対パス排除)

### Must Have

- notion.ts を5モジュールに分割
- NotionBlock.tsx をブロック種別ごとに分割
- バグ5件すべて修正
- 既存FAIL中の2テストを修復
- PostCard を全ページで統一使用
- import パスを `@/` に統一
- MDXLayout.astro 削除

### Must NOT Have (Guardrails)

- **新機能追加禁止**: コメント機能、検索、多言語対応など
- **デザイン変更禁止**: TailwindCSSクラスの追加・変更はPostCard統一に必要な最小限のみ
- **デプロイ設定変更禁止**: wrangler.jsonc, astro.config.mjs の変更なし
- **新規ライブラリ追加禁止**: 既存依存のみ使用
- **過剰抽象化禁止**: utilityクラス/ファクトリパターン/DI等の導入禁止。ファイル分割のみ
- **テストカバレッジ目標なし**: 既存テストの修復・再構成のみ。新テストは分割に伴う必要最小限

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision

- **Infrastructure exists**: YES
- **Automated tests**: Tests-after (既存テスト修復・再構成)
- **Framework**: Vitest + happy-dom + @testing-library/react

### QA Policy

Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Unit tests**: `pnpm test --run` で全テストPASS確認
- **Build check**: `pnpm build` でコンパイル成功確認
- **Code quality**: grep/ast-grep でパターン検証

### Baseline (現状)

- テスト: 3 PASS (38 tests) / 2 FAIL (notion.test.ts, blogPage.test.tsx)
- ビルド: コンパイル成功、env変数なしで全ページNotion APIエラー (期待通り)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — types + config + barrel scaffolding):
├── Task 1: tsconfig パスエイリアス確認 + 型ファイル整理 [quick]
├── Task 2: src/lib/notion/ ディレクトリ作成 + client.ts + cache.ts 抽出 [unspecified-high]
├── Task 3: src/components/blocks/ ディレクトリ作成 + ブロックコンポーネント分割 [unspecified-high]
└── Task 4: MDXLayout.astro 削除 [quick]

Wave 2 (Core module extraction — notion.ts split):
├── Task 5: database.ts 抽出 (getFormattedDatabase + pagination修正) [deep]
├── Task 6: page.ts 抽出 (getPageBySlug, getBlocks) [unspecified-high]
├── Task 7: tags.ts 抽出 (getAllTags, getPagesByTag) [unspecified-high]
└── Task 8: notion/index.ts barrel + 旧 notion.ts 置換 + import パス更新 [unspecified-high]

Wave 3 (Bug fixes + component unification):
├── Task 9: Footer.astro props バグ修正 [quick]
├── Task 10: BaseLayout.astro OGP バグ修正 + siteName 渡し [quick]
├── Task 11: PostCard.astro 改善 + coverImage 実装 [unspecified-high]
├── Task 12: 全ページの PostCard 統一使用 + FormattedPage import 修正 [unspecified-high]
└── Task 13: [slug].astro データ二重取得修正 [quick]

Wave 4 (Type safety + code quality + import unification):
├── Task 14: `as unknown as` キャスト除去 + 型ガード追加 [deep]
├── Task 15: import パス `@/` 統一 [quick]
├── Task 16: log() 関数のコメントアウト解除 + キャッシュ冗長チェック削除 [quick]

Wave 5 (Test repair + restructure):
├── Task 17: notion.test.ts 修復 + 分割モジュールに合わせたテスト再構成 [deep]
├── Task 18: blogPage.test.tsx 修復 [unspecified-high]
└── Task 19: NotionBlock テスト更新 (新 import パスに対応) [unspecified-high]

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 2 → Task 5 → Task 8 → Task 12 → Task 15 → Task 17 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Wave 1, Wave 3)
```

### Dependency Matrix

| Task  | Depends On | Blocks       |
| ----- | ---------- | ------------ |
| 1     | —          | 2, 3, 14, 15 |
| 2     | 1          | 5, 6, 7, 8   |
| 3     | 1          | 19           |
| 4     | —          | —            |
| 5     | 2          | 8            |
| 6     | 2          | 8            |
| 7     | 2          | 8            |
| 8     | 5, 6, 7    | 12, 17, 18   |
| 9     | —          | 10           |
| 10    | 9          | —            |
| 11    | —          | 12           |
| 12    | 8, 11      | —            |
| 13    | 8          | —            |
| 14    | 1, 8       | 17           |
| 15    | 8, 3       | 17, 18, 19   |
| 16    | 2          | —            |
| 17    | 8, 14, 15  | F1-F4        |
| 18    | 8, 15      | F1-F4        |
| 19    | 3, 15      | F1-F4        |
| F1-F4 | 17, 18, 19 | —            |

### Agent Dispatch Summary

- **Wave 1**: 4 tasks — T1 → `quick`, T2 → `unspecified-high`, T3 → `unspecified-high`, T4 → `quick`
- **Wave 2**: 4 tasks — T5 → `deep`, T6 → `unspecified-high`, T7 → `unspecified-high`, T8 → `unspecified-high`
- **Wave 3**: 5 tasks — T9 → `quick`, T10 → `quick`, T11 → `unspecified-high`, T12 → `unspecified-high`, T13 → `quick`
- **Wave 4**: 3 tasks — T14 → `deep`, T15 → `quick`, T16 → `quick`
- **Wave 5**: 3 tasks — T17 → `deep`, T18 → `unspecified-high`, T19 → `unspecified-high`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. tsconfig パスエイリアス確認 + 型ファイル整理

  **What to do**:
  - `tsconfig.json` の `paths` に `@/*` → `./src/*` エイリアスが設定されていることを確認（なければ追加）
  - `src/types/notion.ts` を確認し、`FormattedPage` 型が export されていることを確認
  - `src/lib/notion.ts` から `FormattedPage` を re-export するか、各ページの import を `@/types/notion` に修正する判断を記録
  - → 方針: `@/types/notion` から直接 import に統一（re-export 不要）

  **Must NOT do**:
  - 型定義の内容変更（構造変更なし）
  - 新しい型の追加

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: tsconfig確認と型export確認のみの軽作業
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - None needed for config verification

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 2, 3, 14, 15
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `tsconfig.json` — 現在の paths 設定を確認。`@/*` エイリアスの有無をチェック
  - `src/types/notion.ts:1-20` — FormattedPage 型の export 状態を確認

  **API/Type References**:
  - `src/types/notion.ts:FormattedPage` — 全ページが import する中心型。exportされているか確認必須

  **External References**:
  - Astro tsconfig: https://docs.astro.build/en/guides/typescript/ — Astro のパスエイリアス設定

  **WHY Each Reference Matters**:
  - tsconfig.json: `@/` エイリアスが機能しないと後続全タスクのimport統一が破綻する
  - types/notion.ts: FormattedPage の export 状態確認が index.astro の import エラー修正の前提

  **Acceptance Criteria**:
  - [ ] `tsconfig.json` の `compilerOptions.paths` に `"@/*": ["./src/*"]` が存在する
  - [ ] `pnpm build` でコンパイル成功 (exit 0)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: tsconfig パスエイリアスが機能する
    Tool: Bash
    Preconditions: tsconfig.json に paths 設定済み
    Steps:
      1. Run: grep -A2 '"@/\*"' tsconfig.json
      2. Assert: output contains "./src/*"
      3. Run: pnpm build 2>&1 | head -20
      4. Assert: no "Cannot find module '@/" errors
    Expected Result: エイリアス設定が存在し、ビルドでパス解決エラーなし
    Failure Indicators: grep が空、またはビルドで "Cannot find module" エラー
    Evidence: .sisyphus/evidence/task-1-tsconfig-alias.txt
  ```

  **Commit**: YES
  - Message: `chore: verify tsconfig path aliases and organize type exports`
  - Files: `tsconfig.json`, `src/types/notion.ts`
  - Pre-commit: `pnpm build`

- [ ] 2. src/lib/notion/ ディレクトリ作成 + client.ts + cache.ts 抽出

  **What to do**:
  - `src/lib/notion/` ディレクトリを作成
  - `src/lib/notion.ts` L1-100 付近から Notion Client 初期化コード（`new Client()`、環境変数チェック）を `src/lib/notion/client.ts` に抽出
  - `src/lib/notion.ts` のキャッシュ関連コード（`getFromCacheOrFetch`、`memoryCache`、TTL定数）を `src/lib/notion/cache.ts` に抽出
  - cache.ts から冗長な Database ID チェック（キャッシュの外側と内側で2回チェック）を1回に削減
  - 旧 `notion.ts` はまだ残す（Task 8 で最終置換）

  **Must NOT do**:
  - キャッシュのロジック変更（チェック削減のみ）
  - 新しいキャッシュ戦略の導入
  - クライアント初期化ロジックの変更

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: ファイル分割は慎重な依存関係の管理が必要
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Tasks 5, 6, 7, 8
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/lib/notion.ts:1-40` — import文、定数定義、環境変数チェック、Client初期化。client.ts の抽出元
  - `src/lib/notion.ts:41-110` — `memoryCache` Map定義、`CacheEntry` 型、`getFromCacheOrFetch` 関数、TTL/STALE定数。cache.ts の抽出元
  - `src/lib/notion.ts:245-260` — `getFormattedDatabase` 冒頭のDatabase IDチェック重複パターン

  **API/Type References**:
  - `src/types/notion.ts` — `CacheEntry` 型がここに移動される可能性。現在 notion.ts 内で定義

  **WHY Each Reference Matters**:
  - notion.ts L1-40: Client初期化の正確な依存関係（import、env変数）を把握してから分割する必要がある
  - notion.ts L41-110: キャッシュコードの境界を正確に特定し、他コードとの依存を切断するため
  - notion.ts L245-260: 重複チェック除去の対象箇所の特定

  **Acceptance Criteria**:
  - [ ] `src/lib/notion/client.ts` が存在し、`Client` インスタンスを export する
  - [ ] `src/lib/notion/cache.ts` が存在し、`getFromCacheOrFetch` を export する
  - [ ] 各ファイルが 200 行以下
  - [ ] `pnpm build` でコンパイル成功

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: client.ts が正しく Client を export する
    Tool: Bash
    Preconditions: src/lib/notion/client.ts が作成済み
    Steps:
      1. Run: grep "export" src/lib/notion/client.ts
      2. Assert: output includes "notion" or "Client" export
      3. Run: wc -l src/lib/notion/client.ts
      4. Assert: line count < 200
    Expected Result: Client がexportされ、ファイルサイズ制限内
    Failure Indicators: export がない、または200行超
    Evidence: .sisyphus/evidence/task-2-client-export.txt

  Scenario: cache.ts が正しく getFromCacheOrFetch を export する
    Tool: Bash
    Preconditions: src/lib/notion/cache.ts が作成済み
    Steps:
      1. Run: grep "export" src/lib/notion/cache.ts
      2. Assert: output includes "getFromCacheOrFetch"
      3. Run: grep -c "NOTION_DATABASE_ID" src/lib/notion/cache.ts
      4. Assert: Database IDチェックが0回（チェックは呼び出し元で行う）
    Expected Result: キャッシュ関数がexportされ、冗長チェックなし
    Failure Indicators: export がない、またはDB IDチェック重複
    Evidence: .sisyphus/evidence/task-2-cache-export.txt
  ```

  **Commit**: YES (groups with 3, 4)
  - Message: `refactor(lib): extract notion client and cache modules`
  - Files: `src/lib/notion/client.ts`, `src/lib/notion/cache.ts`
  - Pre-commit: `pnpm build`

- [ ] 3. src/components/blocks/ ディレクトリ作成 + ブロックコンポーネント分割

  **What to do**:
  - `src/components/blocks/` ディレクトリを作成
  - `src/components/NotionBlock.tsx` (731行) から各ブロックレンダリング関数を個別ファイルに抽出:
    - `blocks/Paragraph.tsx` — paragraph ブロック
    - `blocks/Heading.tsx` — heading_1, heading_2, heading_3 ブロック
    - `blocks/List.tsx` — bulleted_list_item, numbered_list_item, to_do ブロック
    - `blocks/Code.tsx` — code ブロック
    - `blocks/Quote.tsx` — quote, callout ブロック
    - `blocks/Media.tsx` — image, video, embed, bookmark ブロック
    - `blocks/Table.tsx` — table, table_row ブロック
    - `blocks/Toggle.tsx` — toggle ブロック
    - `blocks/Divider.tsx` — divider ブロック
    - `blocks/Column.tsx` — column_list, column ブロック
    - `blocks/RichText.tsx` — RichText レンダリング関数（既存のまま抽出）
  - `blocks/index.tsx` を作成: `NotionBlocks` コンポーネント（dispatch ロジック）を残し、各ブロックを import
  - 旧 `NotionBlock.tsx` は `blocks/index.tsx` で置換（barrel re-export で後方互換維持）
  - `src/components/NotionBlock.tsx` は削除し、`src/components/NotionBlock.tsx` → `export * from './blocks'` のre-export ファイルにするか、各import元を直接更新

  **Must NOT do**:
  - コンポーネントのロジック変更
  - スタイリング変更
  - 新しいブロックタイプの追加
  - Reactのkey prop警告の修正（既存動作維持）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 多数のファイル作成と依存関係の整理が必要
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Task 19
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/components/NotionBlock.tsx:1-50` — import文と型定義。分割後の各ファイルで必要なimportを特定するため
  - `src/components/NotionBlock.tsx:51-100` — RichText レンダリング関数。独立モジュール化の候補
  - `src/components/NotionBlock.tsx:100-700` — 各ブロックのレンダリング関数群。switch-caseのdispatchロジックが主要な分割ポイント
  - `src/components/NotionBlock.tsx:700-731` — `NotionBlocks` コンポーネント（メインexport）。blocks/index.tsx に残す

  **API/Type References**:
  - `src/types/notion.ts:NotionBlockWithChildren` — 全ブロックコンポーネントが受け取るメイン型
  - `src/types/notion.ts:RichTextItem` — RichText コンポーネントが使用する型

  **WHY Each Reference Matters**:
  - NotionBlock.tsx全体: 各ブロックの境界を正確に特定し、共有依存（RichText関数、型）を先に抽出する必要がある
  - 型定義: 分割後の各ファイルで正しいimportを確保するため

  **Acceptance Criteria**:
  - [ ] `src/components/blocks/` に11個のファイル + index.tsx が存在する
  - [ ] 各ファイルが 200 行以下
  - [ ] `import { NotionBlocks } from '@/components/NotionBlock'` が引き続き動作する（後方互換）
  - [ ] `pnpm build` でコンパイル成功
  - [ ] `pnpm test --run` で NotionBlock 関連テスト (15+10=25 tests) がPASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 全ブロックコンポーネントが作成され export されている
    Tool: Bash
    Preconditions: src/components/blocks/ ディレクトリが存在
    Steps:
      1. Run: ls src/components/blocks/
      2. Assert: Paragraph.tsx, Heading.tsx, List.tsx, Code.tsx, Quote.tsx, Media.tsx, Table.tsx, Toggle.tsx, Divider.tsx, Column.tsx, RichText.tsx, index.tsx が存在
      3. Run: wc -l src/components/blocks/*.tsx | sort -n
      4. Assert: 全ファイル200行以下
    Expected Result: 12ファイルが存在し、各200行以下
    Failure Indicators: ファイルが不足、または200行超のファイルが存在
    Evidence: .sisyphus/evidence/task-3-blocks-structure.txt

  Scenario: 後方互換の import が動作する
    Tool: Bash
    Preconditions: 分割完了
    Steps:
      1. Run: pnpm test --run 2>&1
      2. Assert: NotionBlock.test.tsx と NotionBlockExtraTests.test.tsx が PASS
      3. Run: pnpm build 2>&1 | grep -i error
      4. Assert: コンパイルエラーなし
    Expected Result: 既存のimportパスで全テスト・ビルドが成功
    Failure Indicators: テスト失敗またはビルドエラー
    Evidence: .sisyphus/evidence/task-3-backward-compat.txt
  ```

  **Commit**: YES (groups with 2, 4)
  - Message: `refactor(components): split NotionBlock into individual block components`
  - Files: `src/components/blocks/*.tsx`, `src/components/NotionBlock.tsx`
  - Pre-commit: `pnpm test --run && pnpm build`

- [ ] 4. MDXLayout.astro 削除

  **What to do**:
  - `src/layouts/MDXLayout.astro` を削除する
  - `git rm src/layouts/MDXLayout.astro` を実行

  **Must NOT do**:
  - 他のレイアウトファイルの変更

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 1ファイル削除のみ
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/layouts/MDXLayout.astro` — 削除対象。全ファイル検索でゼロ参照を確認済み

  **WHY Each Reference Matters**:
  - 参照がゼロであることは確認済みだが、削除前に念のため再確認すべき

  **Acceptance Criteria**:
  - [ ] `src/layouts/MDXLayout.astro` が存在しない
  - [ ] `pnpm build` でコンパイル成功

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: MDXLayout が削除され、ビルドに影響なし
    Tool: Bash
    Preconditions: MDXLayout.astro が存在する状態
    Steps:
      1. Run: test -f src/layouts/MDXLayout.astro && echo "EXISTS" || echo "DELETED"
      2. Assert: output is "DELETED"
      3. Run: pnpm build 2>&1 | grep -i "MDXLayout"
      4. Assert: 0 matches (参照なし)
    Expected Result: ファイルが削除され、ビルドに影響なし
    Failure Indicators: ファイルが残っている、またはビルドでMDXLayout参照エラー
    Evidence: .sisyphus/evidence/task-4-mdxlayout-deleted.txt
  ```

  **Commit**: YES (groups with 2, 3)
  - Message: `chore: remove unused MDXLayout.astro`
  - Files: `src/layouts/MDXLayout.astro` (deleted)
  - Pre-commit: `pnpm build`

- [ ] 5. database.ts 抽出 (getFormattedDatabase + pagination修正)

  **What to do**:
  - `src/lib/notion.ts` から `getFormattedDatabase` 関数とその依存（formatPage, formatRichText等のフォーマッティング関数）を `src/lib/notion/database.ts` に抽出
  - **バグ修正**: `getFormattedDatabase` に Notion API のページネーション処理を追加（`has_more` / `next_cursor` の処理）。参考: 同ファイル内の `getBlocks` 関数が正しくページネーション処理している
  - フォーマッティング関数群（`formatPage`, `formatRichText` 等）が複数モジュールで共有される場合は `src/lib/notion/formatters.ts` に分離

  **Must NOT do**:
  - フォーマッティングロジックの変更（ページネーション追加以外）
  - Notion API のクエリパラメータ変更
  - ソート順の変更

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: ページネーションのバグ修正を含む。正しい実装には getBlocks のパターンを理解し適用する必要がある
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `src/lib/notion.ts:240-340` — `getFormattedDatabase` 関数。抽出元。ページネーション未対応の箇所
  - `src/lib/notion.ts:340-430` — `getBlocks` 関数。ページネーション処理の正しいパターン（`has_more`/`next_cursor` ループ）。database.ts でこのパターンを踏襲する
  - `src/lib/notion.ts:110-240` — `formatPage`, `formatRichText` 等のフォーマッティング関数群。database.ts の依存

  **API/Type References**:
  - `src/types/notion.ts:FormattedPage` — `getFormattedDatabase` の戻り値型
  - Notion SDK: `@notionhq/client` の `databases.query` API — ページネーションパラメータ

  **WHY Each Reference Matters**:
  - notion.ts L340-430: ページネーションの「正解」パターンが既にここにある。コピーして適用すればよい
  - notion.ts L240-340: 抽出対象の正確な境界と依存を把握するため
  - notion.ts L110-240: formatters の共有状況を把握し、適切なファイルに配置するため

  **Acceptance Criteria**:
  - [ ] `src/lib/notion/database.ts` が存在する
  - [ ] `getFormattedDatabase` がページネーション対応している (`has_more`/`next_cursor` ループ)
  - [ ] ファイルが 200 行以下
  - [ ] `pnpm build` でコンパイル成功

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: database.ts がページネーション対応の getFormattedDatabase を export する
    Tool: Bash
    Preconditions: src/lib/notion/database.ts が作成済み
    Steps:
      1. Run: grep "has_more\|next_cursor" src/lib/notion/database.ts
      2. Assert: both "has_more" and "next_cursor" appear
      3. Run: grep "export.*getFormattedDatabase" src/lib/notion/database.ts
      4. Assert: function is exported
      5. Run: wc -l src/lib/notion/database.ts
      6. Assert: line count < 200
    Expected Result: ページネーション処理が含まれ、関数がexportされ、200行以下
    Failure Indicators: ページネーション処理がない、export がない、200行超
    Evidence: .sisyphus/evidence/task-5-database-pagination.txt
  ```

  **Commit**: YES (groups with 6, 7, 8)
  - Message: `refactor(lib): extract database module with pagination fix`
  - Files: `src/lib/notion/database.ts`
  - Pre-commit: `pnpm build`

- [ ] 6. page.ts 抽出 (getPageBySlug, getBlocks)

  **What to do**:
  - `src/lib/notion.ts` から `getPageBySlug` と `getBlocks` 関数を `src/lib/notion/page.ts` に抽出
  - `client.ts` と `cache.ts` からの import を設定
  - Database ID チェックは呼び出し元（この関数内）で1回のみに統一

  **Must NOT do**:
  - getBlocks のページネーションロジック変更（既に正しく動作）
  - 新しい API 関数の追加

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 関数抽出 + 依存関係の正しい配線
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `src/lib/notion.ts:340-500` — `getBlocks` 関数（ページネーション付き）。page.ts に移動
  - `src/lib/notion.ts:500-600` — `getPageBySlug` 関数。page.ts に移動
  - `src/lib/notion/client.ts` — (Task 2 で作成) notion Client instance の import 元
  - `src/lib/notion/cache.ts` — (Task 2 で作成) `getFromCacheOrFetch` の import 元

  **WHY Each Reference Matters**:
  - notion.ts L340-600: 抽出対象の正確な範囲。関数間の依存関係を確認するため

  **Acceptance Criteria**:
  - [ ] `src/lib/notion/page.ts` が存在し、`getPageBySlug` と `getBlocks` を export する
  - [ ] ファイルが 200 行以下
  - [ ] `pnpm build` でコンパイル成功

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: page.ts が正しく関数を export する
    Tool: Bash
    Preconditions: src/lib/notion/page.ts が作成済み
    Steps:
      1. Run: grep "export" src/lib/notion/page.ts
      2. Assert: "getPageBySlug" and "getBlocks" both appear
      3. Run: wc -l src/lib/notion/page.ts
      4. Assert: line count < 200
    Expected Result: 両関数がexportされ、200行以下
    Failure Indicators: export がない、200行超
    Evidence: .sisyphus/evidence/task-6-page-export.txt
  ```

  **Commit**: YES (groups with 5, 7, 8)
  - Message: `refactor(lib): extract page module`
  - Files: `src/lib/notion/page.ts`
  - Pre-commit: `pnpm build`

- [ ] 7. tags.ts 抽出 (getAllTags, getPagesByTag)

  **What to do**:
  - `src/lib/notion.ts` から `getAllTags` と `getPagesByTag` 関数を `src/lib/notion/tags.ts` に抽出
  - `client.ts`, `cache.ts`, `database.ts` (formatPage) からの import を設定
  - Database ID チェックを1回に統一

  **Must NOT do**:
  - タグ処理ロジックの変更
  - 新しいタグ関連機能の追加

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 関数抽出 + 依存関係の配線
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: Task 8
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `src/lib/notion.ts:600-763` — `getAllTags` と `getPagesByTag` 関数。tags.ts に移動
  - `src/lib/notion/database.ts` — (Task 5 で作成) `formatPage` 共有関数の import 元

  **WHY Each Reference Matters**:
  - notion.ts L600-763: 抽出対象。formatPage への依存があるため database.ts または formatters.ts からの import が必要

  **Acceptance Criteria**:
  - [ ] `src/lib/notion/tags.ts` が存在し、`getAllTags` と `getPagesByTag` を export する
  - [ ] ファイルが 200 行以下

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: tags.ts が正しく関数を export する
    Tool: Bash
    Preconditions: src/lib/notion/tags.ts が作成済み
    Steps:
      1. Run: grep "export" src/lib/notion/tags.ts
      2. Assert: "getAllTags" and "getPagesByTag" both appear
      3. Run: wc -l src/lib/notion/tags.ts
      4. Assert: line count < 200
    Expected Result: 両関数がexportされ、200行以下
    Failure Indicators: export がない、200行超
    Evidence: .sisyphus/evidence/task-7-tags-export.txt
  ```

  **Commit**: YES (groups with 5, 6, 8)
  - Message: `refactor(lib): extract tags module`
  - Files: `src/lib/notion/tags.ts`
  - Pre-commit: `pnpm build`

- [ ] 8. notion/index.ts barrel + 旧 notion.ts 置換 + import パス更新

  **What to do**:
  - `src/lib/notion/index.ts` を作成し、全モジュールからの public API を re-export:
    ```ts
    export { notion } from './client';
    export { getFromCacheOrFetch } from './cache';
    export { getFormattedDatabase } from './database';
    export { getPageBySlug, getBlocks } from './page';
    export { getAllTags, getPagesByTag } from './tags';
    ```
  - 旧 `src/lib/notion.ts` を削除
  - 全ページファイルの import パスを更新:
    - `from '../lib/notion'` → `from '@/lib/notion'` (barrel 経由で同じAPI)
    - `from '../../lib/notion'` → `from '@/lib/notion'`
  - FormattedPage の import を `from '@/types/notion'` に修正（`from '@/lib/notion'` からの import を排除）

  **Must NOT do**:
  - public API の変更（同じ関数名・同じシグネチャ）
  - ページコンポーネントのロジック変更

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 多数のファイルのimport更新。後方互換を保ちつつの置換
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after Tasks 5, 6, 7)
  - **Blocks**: Tasks 12, 13, 14, 17, 18
  - **Blocked By**: Tasks 5, 6, 7

  **References**:

  **Pattern References**:
  - `src/pages/index.astro:2-4` — `import { getFormattedDatabase } from '../lib/notion'` + `FormattedPage` import（修正対象）
  - `src/pages/posts/index.astro:2-4` — 同上
  - `src/pages/posts/[slug].astro:2-5` — `getFormattedDatabase`, `getPageBySlug`, `NotionBlocks` import（修正対象）
  - `src/pages/tags/[tag].astro:2-4` — `getAllTags`, `getPagesByTag` import（修正対象）

  **WHY Each Reference Matters**:
  - 各ページファイル: 旧import パスの正確な特定が必要。置換漏れはビルドエラーになる

  **Acceptance Criteria**:
  - [ ] `src/lib/notion/index.ts` が存在する
  - [ ] 旧 `src/lib/notion.ts` が削除されている
  - [ ] `grep -r "from.*lib/notion'" src/pages/` で全パスが `@/lib/notion` を指す
  - [ ] `grep -r "FormattedPage.*from.*lib/notion" src/` → 0 matches（types/notion から import すべき）
  - [ ] `pnpm build` でコンパイル成功

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: barrel が全 public API を re-export する
    Tool: Bash
    Preconditions: src/lib/notion/index.ts が作成済み、旧 notion.ts が削除済み
    Steps:
      1. Run: grep "export" src/lib/notion/index.ts
      2. Assert: getFormattedDatabase, getPageBySlug, getBlocks, getAllTags, getPagesByTag が含まれる
      3. Run: test -f src/lib/notion.ts && echo "OLD EXISTS" || echo "OLD DELETED"
      4. Assert: "OLD DELETED"
      5. Run: pnpm build 2>&1 | grep -i "error"
      6. Assert: コンパイルエラーなし
    Expected Result: barrel が完全で、旧ファイルが削除され、ビルド成功
    Failure Indicators: re-export 漏れ、旧ファイル残存、ビルドエラー
    Evidence: .sisyphus/evidence/task-8-barrel-complete.txt

  Scenario: FormattedPage import が types/notion から行われている
    Tool: Bash
    Preconditions: import 更新完了
    Steps:
      1. Run: grep -r "FormattedPage" src/pages/ src/components/
      2. Assert: 全て "@/types/notion" からの import
      3. Run: grep -r "FormattedPage.*from.*lib/notion" src/
      4. Assert: 0 matches
    Expected Result: FormattedPage が types/notion から import されている
    Failure Indicators: lib/notion からの FormattedPage import が残存
    Evidence: .sisyphus/evidence/task-8-formattedpage-import.txt
  ```

  **Commit**: YES (groups with 5, 6, 7)
  - Message: `refactor(lib): complete notion.ts module split with barrel export`
  - Files: `src/lib/notion/index.ts`, `src/lib/notion.ts` (deleted), `src/pages/**/*.astro`
  - Pre-commit: `pnpm build`

- [ ] 9. Footer.astro props バグ修正

  **What to do**:
  - `src/components/Footer.astro` L4: `const siteName = Astro.props;` → `const { siteName } = Astro.props;` に修正
  - Props interface に `siteName: string` を定義

  **Must NOT do**:
  - Footer のデザイン変更
  - 新しい props の追加

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 1行の修正
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11, 12, 13)
  - **Blocks**: Task 10
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/components/Footer.astro:1-20` — バグ箇所。L4 の props destructuring ミス
  - `src/components/Header.astro:1-10` — 正しい props destructuring パターンの参考

  **WHY Each Reference Matters**:
  - Footer.astro: バグの正確な行を特定するため
  - Header.astro: 正しいパターンを踏襲するため

  **Acceptance Criteria**:
  - [ ] `Footer.astro` で `const { siteName } = Astro.props;` が使用されている
  - [ ] `pnpm build` でコンパイル成功

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Footer が siteName を正しく destructure する
    Tool: Bash
    Preconditions: Footer.astro が修正済み
    Steps:
      1. Run: grep "const.*siteName.*=.*Astro.props" src/components/Footer.astro
      2. Assert: output contains "{ siteName }" (destructured)
      3. Assert: output does NOT contain "const siteName = Astro.props" (non-destructured)
    Expected Result: destructured form が使用されている
    Failure Indicators: 旧パターンが残存
    Evidence: .sisyphus/evidence/task-9-footer-props.txt

  Scenario: Footer に [object Object] が出力されない
    Tool: Bash
    Preconditions: Footer.astro が修正済み
    Steps:
      1. Run: grep -r "object Object" src/components/Footer.astro
      2. Assert: 0 matches
    Expected Result: object Object の文字列が含まれない
    Failure Indicators: [object Object] の文字列が残存
    Evidence: .sisyphus/evidence/task-9-footer-no-object.txt
  ```

  **Commit**: YES (groups with 10)
  - Message: `fix(layout): fix Footer props destructuring`
  - Files: `src/components/Footer.astro`
  - Pre-commit: `pnpm build`

- [ ] 10. BaseLayout.astro OGP バグ修正 + siteName 渡し

  **What to do**:
  - `src/layouts/BaseLayout.astro` の og:type meta tag を修正:
    - `summary ? 'blog' : 'top'` → `summary ? 'article' : 'website'`（有効な OGP タイプに変更）
  - `<Footer />` コンポーネントに `siteName={siteName}` props を渡す
  - `siteName` が BaseLayout の props から取得されていることを確認（`Astro.props` または env 変数から）

  **Must NOT do**:
  - 新しい meta tags の追加
  - SEO 関連の追加改善
  - レイアウト構造の変更

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 2行の修正
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Task 9 が先行するのが望ましいが、独立して可能)
  - **Parallel Group**: Wave 3 (with Tasks 9, 11, 12, 13)
  - **Blocks**: None
  - **Blocked By**: Task 9

  **References**:

  **Pattern References**:
  - `src/layouts/BaseLayout.astro:1-30` — Props 定義と meta tags。og:type の修正箇所
  - `src/layouts/BaseLayout.astro:30-50` — `<Footer />` コンポーネントの使用箇所。siteName props 追加対象
  - `src/components/Footer.astro` — (Task 9 で修正済み) siteName props を受け取る

  **WHY Each Reference Matters**:
  - BaseLayout.astro: og:type の正確な行と Footer の使用箇所を特定するため

  **Acceptance Criteria**:
  - [ ] `grep "og:type" src/layouts/BaseLayout.astro` が `'article'` と `'website'` を含む
  - [ ] `grep "og:type" src/layouts/BaseLayout.astro` が `'blog'` や `'top'` を含まない
  - [ ] `grep "Footer" src/layouts/BaseLayout.astro` が `siteName` props を含む

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: OGP タイプが有効な値に修正されている
    Tool: Bash
    Preconditions: BaseLayout.astro が修正済み
    Steps:
      1. Run: grep "og:type" src/layouts/BaseLayout.astro
      2. Assert: "article" or "website" が含まれる
      3. Assert: "blog" と "top" が含まれない
    Expected Result: og:type が article/website の有効値
    Failure Indicators: 無効な og:type 値が残存
    Evidence: .sisyphus/evidence/task-10-ogp-type.txt

  Scenario: Footer に siteName が渡されている
    Tool: Bash
    Preconditions: BaseLayout.astro が修正済み
    Steps:
      1. Run: grep -A1 "Footer" src/layouts/BaseLayout.astro
      2. Assert: "siteName" が props として渡されている
    Expected Result: Footer に siteName props が存在する
    Failure Indicators: siteName props がない
    Evidence: .sisyphus/evidence/task-10-footer-sitename.txt
  ```

  **Commit**: YES (groups with 9)
  - Message: `fix(layout): fix OGP type values and pass siteName to Footer`
  - Files: `src/layouts/BaseLayout.astro`
  - Pre-commit: `pnpm build`

- [ ] 11. PostCard.astro 改善 + coverImage 実装

  **What to do**:
  - `src/components/PostCard.astro` の `coverImage` prop を実際にテンプレートで使用する:
    - thumbnail/coverImage が存在する場合、カード上部に画像を表示
    - 存在しない場合はフォールバック（画像なし or プレースホルダー）
  - 既存の inline PostCard マークアップ（`index.astro`, `posts/index.astro`）と機能を統合:
    - tags 表示、date 表示、summary 表示を含む
    - 既存ページの inline マークアップから必要な表示要素を全て PostCard に含める

  **Must NOT do**:
  - 新しいデザインの導入（既存のTailwind クラスを踏襲）
  - アニメーション/ホバーエフェクトの追加
  - 新しい props の追加（coverImage の使用のみ）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 3ページの inline マークアップを1コンポーネントに統合。差分の確認が必要
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 12, 13)
  - **Blocks**: Task 12
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/components/PostCard.astro:1-50` — 現在のPostCard。coverImage prop は受け取るが未使用
  - `src/pages/index.astro:30-80` — inline PostCard マークアップ。PostCard に統合すべき表示要素の参考
  - `src/pages/posts/index.astro:25-65` — inline PostCard マークアップ。同上
  - `src/pages/tags/[tag].astro:30-50` — PostCard 使用箇所（既にPostCard コンポーネントを使用）

  **WHY Each Reference Matters**:
  - PostCard.astro: 現在の props interface と template を把握するため
  - index.astro / posts/index.astro: inline マークアップから PostCard に統合すべき要素（tags表示、date表示等）を特定するため
  - tags/[tag].astro: 既存のPostCard使用パターンとの整合性を確認するため

  **Acceptance Criteria**:
  - [ ] PostCard.astro のテンプレートで `coverImage` が使用されている
  - [ ] coverImage が null/undefined の場合のフォールバック処理がある
  - [ ] index.astro と posts/index.astro の inline カードと同等の表示要素を含む

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: PostCard が coverImage を表示する
    Tool: Bash
    Preconditions: PostCard.astro が更新済み
    Steps:
      1. Run: grep "coverImage\|thumbnail" src/components/PostCard.astro
      2. Assert: coverImage がテンプレートで参照されている（表示に使用）
      3. Run: grep "img\|Image" src/components/PostCard.astro
      4. Assert: img 要素が存在する
    Expected Result: coverImage が img 要素で表示されている
    Failure Indicators: coverImage がテンプレートで使用されていない
    Evidence: .sisyphus/evidence/task-11-postcard-image.txt

  Scenario: coverImage がない場合のフォールバック
    Tool: Bash
    Preconditions: PostCard.astro が更新済み
    Steps:
      1. Run: grep -c "if\|{.*&&\|?\." src/components/PostCard.astro
      2. Assert: coverImage の存在チェックがある
    Expected Result: null/undefined チェックによるフォールバック処理
    Failure Indicators: チェックなしで直接参照
    Evidence: .sisyphus/evidence/task-11-postcard-fallback.txt
  ```

  **Commit**: YES (groups with 12)
  - Message: `refactor(components): improve PostCard with coverImage support`
  - Files: `src/components/PostCard.astro`
  - Pre-commit: `pnpm build`

- [ ] 12. 全ページの PostCard 統一使用 + FormattedPage import 修正

  **What to do**:
  - `src/pages/index.astro`: inline PostCard マークアップを `<PostCard />` コンポーネントに置換
  - `src/pages/posts/index.astro`: inline PostCard マークアップを `<PostCard />` コンポーネントに置換
  - 両ページに `import PostCard from '@/components/PostCard.astro'` を追加
  - `FormattedPage` の import を `from '@/types/notion'` に修正（`from '@/lib/notion'` から変更）

  **Must NOT do**:
  - ページのレイアウト構造変更
  - ページの他のロジック変更
  - 新しいページの追加

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 2ページの inline マークアップ置換。正確な差分管理が必要
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after Tasks 8, 11)
  - **Blocks**: None
  - **Blocked By**: Tasks 8, 11

  **References**:

  **Pattern References**:
  - `src/pages/index.astro:30-80` — 置換対象の inline PostCard マークアップ
  - `src/pages/posts/index.astro:25-65` — 置換対象の inline PostCard マークアップ
  - `src/pages/tags/[tag].astro:10-15` — PostCard import パターンの参考（既に使用中）
  - `src/components/PostCard.astro` — (Task 11 で改善済み) 統一使用するコンポーネント

  **WHY Each Reference Matters**:
  - index.astro / posts/index.astro: 置換対象の inline マークアップの正確な範囲を特定するため
  - tags/[tag].astro: 既存の PostCard import/使用パターンを踏襲するため

  **Acceptance Criteria**:
  - [ ] `src/pages/index.astro` で `<PostCard` が使用されている
  - [ ] `src/pages/posts/index.astro` で `<PostCard` が使用されている
  - [ ] inline カードマークアップ（`<article>` タグ等の重複）が削除されている
  - [ ] `pnpm build` でコンパイル成功

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 全ページで PostCard コンポーネントが使用されている
    Tool: Bash
    Preconditions: index.astro と posts/index.astro が更新済み
    Steps:
      1. Run: grep "PostCard" src/pages/index.astro
      2. Assert: import と使用の両方が存在
      3. Run: grep "PostCard" src/pages/posts/index.astro
      4. Assert: import と使用の両方が存在
      5. Run: grep "PostCard" src/pages/tags/\[tag\].astro
      6. Assert: import と使用が存在（既存）
    Expected Result: 全3ページで PostCard を使用
    Failure Indicators: いずれかのページで PostCard 未使用
    Evidence: .sisyphus/evidence/task-12-postcard-unified.txt

  Scenario: inline カードマークアップが削除されている
    Tool: Bash
    Preconditions: 更新完了
    Steps:
      1. Run: wc -l src/pages/index.astro
      2. Assert: 行数が修正前（約85行）より減少（PostCard使用により簡潔化）
      3. Run: wc -l src/pages/posts/index.astro
      4. Assert: 行数が修正前より減少
    Expected Result: inline マークアップ削除により行数減少
    Failure Indicators: 行数が増加している（inline が残存）
    Evidence: .sisyphus/evidence/task-12-inline-removed.txt
  ```

  **Commit**: YES (groups with 11)
  - Message: `refactor(pages): unify PostCard usage across all pages`
  - Files: `src/pages/index.astro`, `src/pages/posts/index.astro`
  - Pre-commit: `pnpm build`

- [ ] 13. [slug].astro データ二重取得修正

  **What to do**:
  - `src/pages/posts/[slug].astro` で `getStaticPaths` がデータを取得して props として返しているにもかかわらず、ページ本体で再度 `getPageBySlug` を呼び出している問題を修正
  - `getStaticPaths` から返された `props.post` をページ本体で直接使用するように変更
  - ページ本体の `getPageBySlug` 呼び出しを削除

  **Must NOT do**:
  - `getStaticPaths` の戻り値構造変更
  - ページのレンダリングロジック変更
  - 新しいデータ取得パターンの導入

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 数行の変更で二重取得を解消
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 11, 12)
  - **Blocks**: None
  - **Blocked By**: Task 8

  **References**:

  **Pattern References**:
  - `src/pages/posts/[slug].astro:7-30` — `getStaticPaths` 関数。props として `post` データを返している
  - `src/pages/posts/[slug].astro:30-50` — ページ本体。`Astro.props` から受け取った後、再度 `getPageBySlug` を呼んでいる

  **WHY Each Reference Matters**:
  - [slug].astro: 二重取得の正確なパターンを理解し、getStaticPaths の props を活用する修正方法を特定するため

  **Acceptance Criteria**:
  - [ ] ページ本体で `getPageBySlug` が呼ばれていない
  - [ ] `Astro.props` から直接 `post` データを使用している
  - [ ] `pnpm build` でコンパイル成功

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: データ二重取得が解消されている
    Tool: Bash
    Preconditions: [slug].astro が修正済み
    Steps:
      1. Run: grep "getPageBySlug" src/pages/posts/\[slug\].astro
      2. Assert: import 文にのみ存在するか、または完全に削除されている（ページ本体での呼び出しなし）
      3. Run: grep "Astro.props" src/pages/posts/\[slug\].astro
      4. Assert: props からデータを取得している
    Expected Result: getPageBySlug のページ本体での呼び出しが削除されている
    Failure Indicators: ページ本体で getPageBySlug が呼ばれている
    Evidence: .sisyphus/evidence/task-13-double-fetch-removed.txt
  ```

  **Commit**: YES (groups with 11, 12)
  - Message: `fix(pages): remove double data fetch in [slug].astro`
  - Files: `src/pages/posts/[slug].astro`
  - Pre-commit: `pnpm build`

- [ ] 14. `as unknown as` キャスト除去 + 型ガード追加

  **What to do**:
  - `src/lib/notion/` 内の全ファイルで `as unknown as PageResponse` 等のキャスト（6箇所）を特定
  - 各キャストに対して、Notion SDK の実際の戻り値型を確認し、以下のいずれかで置換:
    - **型ガード関数**: `function isPageResponse(obj: unknown): obj is PageResponse` のようなランタイムチェック
    - **より狭いキャスト**: `as PageResponse` で十分な場合は `unknown` 経由を削除
    - **SDK型の直接使用**: Notion SDK の型をそのまま使える場合はキャスト自体を削除
  - 型ガード関数は `src/types/notion.ts` に追加（型定義ファイルに集約）

  **Must NOT do**:
  - `any` 型の導入
  - `@ts-ignore` / `@ts-expect-error` の追加
  - ビジネスロジックの変更

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Notion SDK の型システムを理解し、適切な型ガードを設計する必要がある
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 15, 16)
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 1, 8

  **References**:

  **Pattern References**:
  - `src/lib/notion.ts` (旧、分割後は各モジュール) — `as unknown as` の使用箇所6箇所を特定する必要がある
  - ast-grep で `as unknown as $TYPE` パターンを検索すると全箇所を特定可能

  **API/Type References**:
  - `src/types/notion.ts` — プロジェクト独自の型定義。PageResponse, NotionBlockWithChildren 等
  - `@notionhq/client` の型定義 — SDK が返す実際の型（`GetPageResponse`, `ListBlockChildrenResponse` 等）

  **WHY Each Reference Matters**:
  - 各キャスト箇所: SDK型とプロジェクト型の差分を正確に理解し、最小限の型ガードで安全にする必要がある

  **Acceptance Criteria**:
  - [ ] `grep -r "as unknown as" src/lib/` → 0 matches
  - [ ] `grep -r "as any" src/lib/` → 0 matches
  - [ ] `pnpm build` でコンパイル成功
  - [ ] `pnpm test --run` で型関連テストがPASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: unsafe キャストが除去されている
    Tool: Bash
    Preconditions: 型ガードが追加済み
    Steps:
      1. Run: grep -rn "as unknown as" src/lib/
      2. Assert: 0 matches
      3. Run: grep -rn "as any" src/lib/
      4. Assert: 0 matches
      5. Run: pnpm build 2>&1 | grep -c "error"
      6. Assert: 0 errors
    Expected Result: unsafe キャストゼロ、ビルド成功
    Failure Indicators: キャスト残存またはビルドエラー
    Evidence: .sisyphus/evidence/task-14-type-guards.txt

  Scenario: 型ガードがランタイムで正しく動作する
    Tool: Bash
    Preconditions: 型ガード追加済み
    Steps:
      1. Run: grep -c "function is" src/types/notion.ts
      2. Assert: 1つ以上の型ガード関数が存在
      3. Run: pnpm test --run 2>&1
      4. Assert: テストがPASS（型ガードが既存ロジックを壊していない）
    Expected Result: 型ガードが存在し、テストが通る
    Failure Indicators: 型ガードなし、またはテスト失敗
    Evidence: .sisyphus/evidence/task-14-type-guard-runtime.txt
  ```

  **Commit**: YES
  - Message: `refactor(types): replace unsafe type casts with type guards`
  - Files: `src/lib/notion/*.ts`, `src/types/notion.ts`
  - Pre-commit: `pnpm build`

- [ ] 15. import パス `@/` 統一

  **What to do**:
  - 全 `src/` 配下のファイルで相対パス import (`../`, `../../`) を `@/` エイリアスに置換
  - 対象ファイル: pages, components, lib, test, layouts の全 .ts/.tsx/.astro ファイル
  - `src/env.d.ts` の `../.astro/types` は Astro が自動生成するため変更しない

  **Must NOT do**:
  - import の順序変更
  - 使用されていない import の追加/削除
  - import 先の変更（パスのみ変更）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 機械的な置換作業。ast-grep で一括置換可能
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 14, 16)
  - **Blocks**: Tasks 17, 18, 19
  - **Blocked By**: Tasks 8, 3

  **References**:

  **Pattern References**:
  - grep 結果: 26箇所の相対パス import を特定済み（13ファイル）
  - `tsconfig.json` — `@/*` → `./src/*` エイリアス設定（Task 1 で確認済み）

  **WHY Each Reference Matters**:
  - 全相対パスを漏れなく特定し、正しい `@/` パスに変換するため

  **Acceptance Criteria**:
  - [ ] `grep -r "from '\.\." src/ --include="*.ts" --include="*.tsx" --include="*.astro"` → 0 matches（env.d.ts 除く）
  - [ ] `pnpm build` でコンパイル成功
  - [ ] `pnpm test --run` で全テストPASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 相対パス import がゼロ
    Tool: Bash
    Preconditions: import 置換完了
    Steps:
      1. Run: grep -rn "from '\.\." src/ --include="*.ts" --include="*.tsx" --include="*.astro" | grep -v "env.d.ts"
      2. Assert: 0 matches
      3. Run: grep -rn 'from "\.\.' src/ --include="*.ts" --include="*.tsx" --include="*.astro" | grep -v "env.d.ts"
      4. Assert: 0 matches
    Expected Result: env.d.ts 以外で相対パスゼロ
    Failure Indicators: 相対パスが残存
    Evidence: .sisyphus/evidence/task-15-import-unified.txt

  Scenario: ビルドとテストが通る
    Tool: Bash
    Preconditions: import 置換完了
    Steps:
      1. Run: pnpm build 2>&1 | grep -i "error"
      2. Assert: コンパイルエラーなし
      3. Run: pnpm test --run 2>&1 | tail -5
      4. Assert: テストPASS（FAIL中の2件は別タスクで修復）
    Expected Result: ビルド成功、コンポーネントテスト (3ファイル) PASS
    Failure Indicators: import パス解決エラー
    Evidence: .sisyphus/evidence/task-15-build-test.txt
  ```

  **Commit**: YES
  - Message: `refactor: unify all imports to use @/ path alias`
  - Files: `src/**/*.{ts,tsx,astro}`
  - Pre-commit: `pnpm build`

- [ ] 16. log() 関数のコメントアウト解除 + キャッシュ冗長チェック削除

  **What to do**:
  - `src/lib/notion/cache.ts`（または分割後の適切なファイル）内の `log()` 関数の `info` と `debug` レベルを有効化（コメントアウトを解除）
  - キャッシュ関連コードで Database ID の冗長チェック（同一関数内で2回チェック）を1回に削減（Task 2 で未対応の箇所があれば）

  **Must NOT do**:
  - 新しいログライブラリの導入
  - ログフォーマットの変更
  - キャッシュ戦略の変更

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: コメントアウト解除と冗長チェック削除のみ
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 14, 15)
  - **Blocks**: None
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `src/lib/notion.ts:20-40` (旧) — `log()` 関数定義。`info` と `debug` がコメントアウトされている箇所
  - 分割後: `src/lib/notion/cache.ts` または `src/lib/notion/client.ts` に移動済みの可能性

  **WHY Each Reference Matters**:
  - log関数: コメントアウトの正確な行を特定するため

  **Acceptance Criteria**:
  - [ ] `log()` 関数の `info` と `debug` レベルがコメントアウトされていない
  - [ ] `pnpm build` でコンパイル成功

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 全ログレベルが有効
    Tool: Bash
    Preconditions: log 関数が修正済み
    Steps:
      1. Run: grep -n "// .*info\|// .*debug" src/lib/notion/*.ts
      2. Assert: 0 matches（コメントアウトされたログレベルなし）
      3. Run: grep "info\|debug" src/lib/notion/*.ts | grep -v "//"
      4. Assert: info と debug の両方が有効な行として存在
    Expected Result: 全ログレベルが有効化されている
    Failure Indicators: コメントアウトが残存
    Evidence: .sisyphus/evidence/task-16-log-levels.txt
  ```

  **Commit**: YES
  - Message: `fix(lib): enable all log levels and remove redundant cache checks`
  - Files: `src/lib/notion/cache.ts`
  - Pre-commit: `pnpm build`

- [ ] 17. notion.test.ts 修復 + 分割モジュールに合わせたテスト再構成

  **What to do**:
  - `src/lib/notion.test.ts` の vi.mock エラーを修正:
    - 現在のエラー: `vi.mock('@notionhq/client')` のファクトリが `new Client()` コンストラクタとして動作しない
    - 修正: ファクトリ関数が `Client` クラスのコンストラクタとして動作するよう、`class` ベースまたは `function` ベースのモックに変更
  - テストファイルを分割モジュール構造に合わせて再構成:
    - `src/lib/notion/database.test.ts` — getFormattedDatabase のテスト（ページネーションテスト追加）
    - `src/lib/notion/page.test.ts` — getPageBySlug, getBlocks のテスト
    - `src/lib/notion/tags.test.ts` — getAllTags, getPagesByTag のテスト
    - `src/lib/notion/cache.test.ts` — キャッシュ関連テスト
  - 旧 `src/lib/notion.test.ts` を削除
  - 新テストケース追加: `getFormattedDatabase` のページネーション処理テスト（Task 5 で追加した機能）

  **Must NOT do**:
  - テストの論理的な変更（モック修正とファイル分割のみ）
  - カバレッジ目標の設定
  - テスト以外のファイル変更

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: vi.mock の修正は Vitest の内部動作理解が必要。テスト再構成は多ファイル操作
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 18, 19)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 8, 14, 15

  **References**:

  **Pattern References**:
  - `src/lib/notion.test.ts:1-30` — vi.mock 設定。エラーの根本原因（コンストラクタモック）
  - `src/lib/notion.test.ts:30-610` — 全テストケース。分割先モジュールごとにグループ化
  - `src/test/setup.ts:1-20` — グローバルモック設定。`@ts-expect-error` 箇所
  - `src/test/mocks/notionData.ts` — テスト用モックデータ。テスト分割後も共有

  **API/Type References**:
  - Vitest docs: `vi.mock()` のファクトリ関数 — クラスモックの正しいパターン

  **External References**:
  - https://vitest.dev/api/vi.html#vi-mock — vi.mock のファクトリ関数ドキュメント

  **WHY Each Reference Matters**:
  - notion.test.ts L1-30: vi.mock エラーの原因を特定し、正しいモックパターンに修正するため
  - notion.test.ts 全体: テストケースをどのモジュールテストに振り分けるか決定するため
  - setup.ts: グローバルモックの `@ts-expect-error` も修正できるか確認するため

  **Acceptance Criteria**:
  - [ ] `pnpm test --run` → ALL PASS (0 failures)
  - [ ] 旧 `src/lib/notion.test.ts` が削除されている
  - [ ] `src/lib/notion/` に database.test.ts, page.test.ts, tags.test.ts, cache.test.ts が存在する
  - [ ] ページネーションのテストケースが存在する

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 全テストが PASS する
    Tool: Bash
    Preconditions: テストファイルが再構成済み
    Steps:
      1. Run: pnpm test --run 2>&1
      2. Assert: "0 failed" または "Test Files  X passed" (failed なし)
      3. Assert: テスト数が38以上（既存38 + ページネーション追加分）
    Expected Result: 全テスト PASS、テスト数38以上
    Failure Indicators: テスト失敗、テスト数減少
    Evidence: .sisyphus/evidence/task-17-all-tests-pass.txt

  Scenario: テストファイルが分割されている
    Tool: Bash
    Preconditions: テスト再構成完了
    Steps:
      1. Run: ls src/lib/notion/*.test.ts
      2. Assert: database.test.ts, page.test.ts, tags.test.ts, cache.test.ts が存在
      3. Run: test -f src/lib/notion.test.ts && echo "OLD EXISTS" || echo "OLD DELETED"
      4. Assert: "OLD DELETED"
    Expected Result: 4つのテストファイルが存在し、旧ファイルが削除されている
    Failure Indicators: テストファイルが不足、旧ファイルが残存
    Evidence: .sisyphus/evidence/task-17-test-split.txt
  ```

  **Commit**: YES (groups with 18, 19)
  - Message: `test: repair and restructure notion tests for new module layout`
  - Files: `src/lib/notion/*.test.ts`, `src/lib/notion.test.ts` (deleted)
  - Pre-commit: `pnpm test --run`

- [ ] 18. blogPage.test.tsx 修復

  **What to do**:
  - `src/test/integration/blogPage.test.tsx` の vi.mock エラーを修正:
    - 同じ原因: `vi.mock('@notionhq/client')` のコンストラクタ問題
    - Task 17 と同じ修正パターンを適用
  - import パスを更新（`@/lib/notion`, `@/components/NotionBlock` 等）
  - モックデータの import パスを更新

  **Must NOT do**:
  - テストの論理的な変更
  - 新しいインテグレーションテストの追加

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Task 17 と同じパターンの修正だが、インテグレーションテスト固有の考慮が必要
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 17, 19)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 8, 15

  **References**:

  **Pattern References**:
  - `src/test/integration/blogPage.test.tsx:1-40` — vi.mock 設定とimport文。エラーの原因箇所
  - `src/lib/notion/` — (Task 17 で修正) 同じ vi.mock パターンを踏襲

  **WHY Each Reference Matters**:
  - blogPage.test.tsx: 同じ vi.mock 修正パターンを適用するため

  **Acceptance Criteria**:
  - [ ] `pnpm test --run src/test/integration/blogPage.test.tsx` → PASS
  - [ ] import パスが `@/` エイリアスを使用している

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: blogPage テストが PASS する
    Tool: Bash
    Preconditions: blogPage.test.tsx が修正済み
    Steps:
      1. Run: pnpm test --run src/test/integration/blogPage.test.tsx 2>&1
      2. Assert: "passed" が含まれ、"failed" が含まれない
    Expected Result: テスト PASS
    Failure Indicators: テスト FAIL
    Evidence: .sisyphus/evidence/task-18-blogpage-test.txt

  Scenario: import パスが @/ エイリアスを使用
    Tool: Bash
    Preconditions: blogPage.test.tsx が修正済み
    Steps:
      1. Run: grep "from '\.\." src/test/integration/blogPage.test.tsx
      2. Assert: 0 matches
    Expected Result: 相対パスなし
    Failure Indicators: 相対パス残存
    Evidence: .sisyphus/evidence/task-18-import-path.txt
  ```

  **Commit**: YES (groups with 17, 19)
  - Message: `test: repair blogPage integration test`
  - Files: `src/test/integration/blogPage.test.tsx`
  - Pre-commit: `pnpm test --run`

- [ ] 19. NotionBlock テスト更新 (新 import パスに対応)

  **What to do**:
  - `src/components/NotionBlock.test.tsx` の import パスを更新:
    - `from '../../components/NotionBlock'` → `from '@/components/blocks'` or `from '@/components/NotionBlock'`（後方互換に依存）
  - `src/components/NotionBlockExtraTests.test.tsx` の import パスを更新
  - `src/components/RichText.test.tsx` の import パスを更新
  - テストが blocks/ 配下の新ファイル構造で正しく動作することを確認

  **Must NOT do**:
  - テストの論理的な変更
  - 新しいテストケースの追加
  - テストファイルの分割（既に適切なサイズ）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 3ファイルのimport更新と動作確認
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 17, 18)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 3, 15

  **References**:

  **Pattern References**:
  - `src/components/NotionBlock.test.tsx:1-10` — import 文。更新対象
  - `src/components/NotionBlockExtraTests.test.tsx:1-10` — import 文。更新対象
  - `src/components/RichText.test.tsx:1-10` — import 文。更新対象
  - `src/components/blocks/index.tsx` — (Task 3 で作成) 新しいimport先

  **WHY Each Reference Matters**:
  - 各テストファイルの import: 分割後のコンポーネント構造に正しくマッピングするため

  **Acceptance Criteria**:
  - [ ] `pnpm test --run` でNotionBlock関連3ファイルが全てPASS (25テスト)
  - [ ] import パスが `@/` エイリアスを使用

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: NotionBlock テストが全 PASS
    Tool: Bash
    Preconditions: テストファイルの import が更新済み
    Steps:
      1. Run: pnpm test --run src/components/ 2>&1
      2. Assert: 3 ファイル PASS、0 FAIL
      3. Assert: 25 テスト PASS
    Expected Result: 全3テストファイルがPASS
    Failure Indicators: テスト FAIL
    Evidence: .sisyphus/evidence/task-19-notionblock-tests.txt

  Scenario: 相対パス import がゼロ
    Tool: Bash
    Preconditions: import 更新完了
    Steps:
      1. Run: grep "from '\.\." src/components/*.test.tsx
      2. Assert: 0 matches
    Expected Result: 全テストファイルが @/ エイリアスを使用
    Failure Indicators: 相対パスが残存
    Evidence: .sisyphus/evidence/task-19-import-unified.txt
  ```

  **Commit**: YES (groups with 17, 18)
  - Message: `test: update NotionBlock test imports for new module structure`
  - Files: `src/components/*.test.tsx`
  - Pre-commit: `pnpm test --run`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
      Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
      Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
      Run `pnpm test --run` + `pnpm build`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify no file exceeds 200 lines.
      Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
      Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (all modules imported correctly, all pages render, all tests pass). Save to `.sisyphus/evidence/final-qa/`.
      Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
      For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
      Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| After Tasks | Commit Message                                                             | Files                                                     |
| ----------- | -------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1           | `chore: verify tsconfig path aliases and organize type exports`            | tsconfig.json, src/types/notion.ts                        |
| 2           | `refactor(lib): extract notion client and cache modules`                   | src/lib/notion/client.ts, src/lib/notion/cache.ts         |
| 3           | `refactor(components): split NotionBlock into individual block components` | src/components/blocks/\*.tsx                              |
| 4           | `chore: remove unused MDXLayout.astro`                                     | src/layouts/MDXLayout.astro                               |
| 5-8         | `refactor(lib): complete notion.ts module split with pagination fix`       | src/lib/notion/\*.ts, src/lib/notion.ts (deleted)         |
| 9-10        | `fix(layout): fix Footer props destructuring and OGP type values`          | src/components/Footer.astro, src/layouts/BaseLayout.astro |
| 11-13       | `refactor(pages): unify PostCard usage and fix data double-fetch`          | src/components/PostCard.astro, src/pages/\*_/_.astro      |
| 14          | `refactor(types): replace unsafe type casts with type guards`              | src/lib/notion/\*.ts, src/types/notion.ts                 |
| 15          | `refactor: unify all imports to use @/ path alias`                         | src/\*_/_.{ts,tsx,astro}                                  |
| 16          | `fix(lib): enable all log levels and remove redundant cache checks`        | src/lib/notion/cache.ts                                   |
| 17-19       | `test: repair and restructure tests for new module layout`                 | src/\*_/_.test.{ts,tsx}                                   |

---

## Success Criteria

### Verification Commands

```bash
pnpm test --run          # Expected: ALL PASS, 0 failures
pnpm build               # Expected: exit 0, no compilation errors
grep -r "as unknown as" src/lib/   # Expected: 0 matches
grep -r "from '\.\." src/          # Expected: 0 matches (all @/ alias)
wc -l src/lib/notion/*.ts          # Expected: each file < 200 lines
wc -l src/components/blocks/*.tsx   # Expected: each file < 200 lines
find src/layouts/MDXLayout.astro    # Expected: not found (deleted)
```

### Final Checklist

- [ ] All "Must Have" items present and verified
- [ ] All "Must NOT Have" items absent and verified
- [ ] All tests pass (including previously failing 2)
- [ ] Build succeeds
- [ ] No file exceeds 200 lines
- [ ] All imports use `@/` alias
- [ ] Zero `as unknown as` in lib/
