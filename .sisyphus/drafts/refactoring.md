# Draft: プロジェクト全体リファクタリング

## 調査結果サマリー

### プロジェクト概要

- **Tech Stack**: Astro + React + TailwindCSS + TypeScript
- **目的**: Notion CMS → 静的ブログサイト生成
- **規模**: src配下17ファイル、主要ファイル2つが巨大（notion.ts 763行、NotionBlock.tsx 731行）

### 発見した問題（深刻度順）

#### バグ（実行時エラーの可能性）

1. **Footer.astro L4**: `const siteName = Astro.props;` → propsオブジェクト全体を取得。`const { siteName } = Astro.props;` であるべき。さらに `BaseLayout` から `siteName` が渡されていない
2. **og:type が不正**: `summary ? 'blog' : 'top'` → `'top'` は有効なOGPタイプではない。`'article'` と `'website'` が正しい
3. **FormattedPage の import 不整合**: `index.astro` が `lib/notion` から型をインポートしているが、notion.tsはFormattedPageをre-exportしていない
4. **getFormattedDatabase のページネーション欠如**: Notion API の `has_more`/`next_cursor` を処理していない（getBlocksでは処理している）
5. **PostCard.astro**: `coverImage` prop を受け取るが使用していない

#### アーキテクチャ問題

1. **巨大モノリシックファイル**: `notion.ts`（763行）と `NotionBlock.tsx`（731行）が1ファイルに全責務を集中
2. **コード重複**: ポストカードのHTML/CSSが `index.astro`, `posts/index.astro` でインラインで重複（`PostCard.astro` は `tags/[tag].astro` でのみ使用）
3. **Database IDチェックの重複**: 全API関数で同一チェックが2回ずつ（キャッシュの外と中）
4. **エラーハンドリングのボイラープレート重複**: 全API関数で同じパターンをコピペ
5. **未使用ファイル**: `MDXLayout.astro` が存在するが未使用

#### 型安全性

1. **`as unknown as PageResponse`** キャスト多数（6箇所）
2. **テストのグローバルモック**: `@ts-expect-error` を3箇所で使用、脆いパターン

#### コード品質

1. **ログ関数**: `info`と`debug`レベルがコメントアウトで無効化
2. **インメモリキャッシュ**: 静的ビルドでは毎回リセットされる（意味が薄い）
3. **キャッシュのバックグラウンドリフレッシュ**: fire-and-forgetでレースコンディションの可能性
4. **`[slug].astro` のデータ二重取得**: `getStaticPaths` とページ本体で同じデータを2回取得

## ベースライン検証結果

### テスト (`pnpm test`)

- **3 PASS**: NotionBlock.test.tsx (15), NotionBlockExtraTests.test.tsx (10), RichText.test.tsx (13) → 合計38テスト
- **2 FAIL**: notion.test.ts (vi.mock コンストラクタ問題), blogPage.test.tsx (同じ問題)
- 原因: `vi.mock('@notionhq/client')` のファクトリが `new Client()` をサポートしていない

### ビルド (`pnpm build`)

- ビルドプロセス自体は成功（Viteコンパイル完了）
- 全ページが `NOTION_DATABASE_ID` 未設定エラー（env変数なし環境では期待通り）

### import パス

- `@/` と `../` が混在（13ファイル中、両方のパターンを使用）
- `tags/[tag].astro`: 同一ファイル内で `@/layouts/` と `../../lib/notion` が混在

### MDXLayout

- 全ファイル検索でゼロ参照 → 削除安全

## Requirements (confirmed)

- 全問題を一括で対応（バグ5件 + アーキテクチャ5件 + 型安全性2件 + 品質4件）
- 全面的リファクタ（スコープ制限なし）
- 既存テストを維持しつつ拡充（Vitest + Testing Library、分割に合わせてテスト再構成）
- 挙動の改善もOK（OGP修正、PostCard統一、キャッシュ見直し等）

## Technical Decisions

- 優先順位: 依存関係順に並べて一括実行（バグ修正→型定義→構造分割→統合）
- テスト戦略: 既存テスト維持・拡充（TDDではなく、実装後にテスト更新）
- スコープ: 全面的 — notion.ts分割、NotionBlock.tsx分割、PostCard統一、バグ全修正、型安全性改善

## Open Questions

- (すべて解決済み)

## Scope Boundaries

- INCLUDE: バグ修正全件、notion.ts分割、NotionBlock.tsx分割、PostCard統一、型安全性改善、MDXLayout削除、キャッシュ改善、ログ改善、テスト再構成
- EXCLUDE: 新機能追加、デザイン変更、デプロイ設定変更
