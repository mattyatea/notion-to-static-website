# Notion-Astroブログシステム

NotionをCMSとして使用し、Astroフレームワークで構築された最新のブログ/Webサイトシステムです。Notionデータベースで管理されたコンテンツをWebサイトとして公開することができます。

## 特徴

- **Notionをコンテンツ管理に使用** - 直感的なNotion UIでコンテンツを作成・編集
- **Astroで高速なウェブサイト** - パフォーマンスに優れた最新のフレームワークを使用
- **TypeScriptでタイプセーフ** - コードベース全体での型安全性を確保
- **React/TailwindCSSでモダンなUI** - 美しくカスタマイズ可能なインターフェース
- **コンテンツキャッシュ機能** - API呼び出しを最適化し、パフォーマンスを向上

## ドキュメント

詳細なドキュメントは以下のリンクから参照できます：

- [技術ガイド](docs/TECHNICAL_GUIDE.md) - プロジェクトのアーキテクチャと設計思想
- [Notion API ガイド](docs/NOTION_API_GUIDE.md) - Notion APIの設定と使用方法
- [コンポーネントガイド](docs/COMPONENTS.md) - 利用可能なコンポーネントと使い方
- [貢献ガイドライン](CONTRIBUTING.md) - プロジェクトへの貢献方法

## セットアップ

### 前提条件

- Node.js 18.x以上
- Notionアカウントとインテグレーション用のAPIキー

### インストール

1. リポジトリをクローン：

```bash
git clone https://github.com/yourusername/notion-astro-blog.git
cd notion-astro-blog
```

2. 依存関係をインストール：

```bash
npm install
# または
yarn install
# または
pnpm install
```

3. `.env.example`を`.env`にコピーして必要な環境変数を設定：

```
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_notion_database_id
```

### Notionデータベースのセットアップ

1. Notionで新しいデータベースを作成
2. 以下のプロパティを持つデータベースを設定：

   - `title` (タイトル): ページのタイトル
   - `slug` (テキスト): URLのスラッグ
   - `date` (日付): 公開日
   - `tags` (複数選択): タグ
   - `summary` (テキスト): ページの概要
   - `status` (選択): 公開状態 (例: "Public", "Draft")
   - `thumbnail` (ファイル & メディア): サムネイル画像

3. [Notion公式ガイド](https://developers.notion.com/docs/create-a-notion-integration)に従って、インテグレーションを作成しAPIキーを取得
4. インテグレーションとデータベースを共有

### 開発サーバーの起動

```bash
npm run dev
# または
yarn dev
# または
pnpm dev
```

http://localhost:4321 で開発サーバーが起動します。

### ビルドと本番デプロイ

```bash
npm run build
# または
yarn build
# または
pnpm build
```

`dist/` ディレクトリに生成されたファイルをお好みのホスティングサービス（Netlify、Vercel、GitHub Pagesなど）にデプロイします。

## プロジェクト構造

```
/
├── docs/               # プロジェクトドキュメント
├── src/
│   ├── components/     # UIコンポーネント
│   │   └── NotionBlock.tsx  # Notionブロックのレンダリング
│   ├── layouts/        # ページレイアウト
│   ├── lib/
│   │   └── notion.ts   # Notion API連携
│   ├── pages/          # ルーティング
│   ├── styles/         # スタイル定義
│   └── types/          # 型定義
│       └── notion.ts   # Notion関連の型
├── .env                # 環境変数
├── CONTRIBUTING.md     # 貢献ガイドライン
└── astro.config.mjs    # Astro設定
```

## カスタマイズ

### テーマとスタイリング

TailwindCSSを使用してスタイリングをカスタマイズできます。`tailwind.config.js`でテーマ設定を変更できます。

### Notionブロックの拡張

新しいNotionブロックタイプをサポートする場合は、以下のファイルを編集します：

1. `src/types/notion.ts` - ブロックタイプの型定義を追加
2. `src/components/NotionBlock.tsx` - 新しいブロックタイプのレンダリングコンポーネントを追加

詳細は[コンポーネントガイド](docs/COMPONENTS.md)を参照してください。

### ページの追加

新しいページタイプを追加する場合は、`src/pages/`ディレクトリに新しい`.astro`ファイルを作成します。

## パフォーマンス最適化

このプロジェクトには以下のパフォーマンス最適化が含まれています：

1. **APIキャッシング** - Notion APIコールの削減と応答時間の短縮
2. **コンポーネントのメモ化** - 不要な再レンダリングの防止
3. **Astroのアイランドアーキテクチャ** - 必要な部分だけJavaScriptを読み込み
4. **画像最適化** - Astroの組み込み機能による画像サイズの最適化

詳細な最適化方法は[技術ガイド](docs/TECHNICAL_GUIDE.md)を参照してください。

## 将来の拡張計画

このプロジェクトでは以下の機能追加が検討されています：

1. **コメント機能** - ブログ記事へのコメント追加
2. **多言語サポート** - 複数言語でのコンテンツ提供
3. **検索機能** - サイト内コンテンツの全文検索
4. **アナリティクス統合** - アクセス解析との連携

これらの機能開発に貢献したい場合は、[CONTRIBUTING.md](CONTRIBUTING.md)を参照してください。

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細はLICENSEファイルを参照してください。

## 貢献

バグ報告や機能リクエストは、GitHubのIssuesを通じてお寄せください。プルリクエストも歓迎します。貢献する前に[貢献ガイドライン](CONTRIBUTING.md)を必ずお読みください。

## サポート

質問や支援が必要な場合は、GitHubのDiscussionsを通じてコミュニティにご相談ください。

---

Notion-Astroブログシステムを使ってすばらしいコンテンツを作成しましょう！
