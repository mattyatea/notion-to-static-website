/**
 * Notion APIとの連携に使用する型定義
 * @file このファイルはNotion APIからのレスポンスと、アプリケーション内部で使用する
 * 整形済みデータ構造の型定義を含みます。
 */

/**
 * Notionのリッチテキストアイテムを表す型
 */
export interface RichTextItem {
  /** テキストの種類 (text, mention, equation等) */
  type: string;

  /** テキストの書式設定 */
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };

  /** プレーンテキスト内容 */
  plain_text: string;

  /** リンクがある場合のURL */
  href: string | null;

  /** 'text'タイプの場合の追加情報 */
  text?: {
    content: string;
    link: { url: string } | null;
  };

  /** 'mention'タイプの場合の追加情報 */
  mention?: {
    type: string;
    [key: string]: unknown;
  };
}

/**
 * Notionのブロック(コンテンツの各部分)を表す型
 * 子ブロックを含む構造を持つ
 */
export interface NotionBlockWithChildren {
  /** ブロックのID */
  id: string;

  /** ブロックの種類 */
  type: string;

  /** 子ブロックがある場合はtrue */
  has_children?: boolean;

  /** 子ブロックの配列 */
  children?: NotionBlockWithChildren[];

  // 各ブロックタイプに対応するプロパティ（タイプに応じて存在するプロパティが異なる）
  paragraph?: {
    rich_text: RichTextItem[];
    color?: string;
  };

  heading_1?: {
    rich_text: RichTextItem[];
    color?: string;
    is_toggleable?: boolean;
  };

  heading_2?: {
    rich_text: RichTextItem[];
    color?: string;
    is_toggleable?: boolean;
  };

  heading_3?: {
    rich_text: RichTextItem[];
    color?: string;
    is_toggleable?: boolean;
  };

  bulleted_list_item?: {
    rich_text: RichTextItem[];
    color?: string;
  };

  numbered_list_item?: {
    rich_text: RichTextItem[];
    color?: string;
  };

  to_do?: {
    rich_text: RichTextItem[];
    checked: boolean;
    color?: string;
  };

  toggle?: {
    rich_text: RichTextItem[];
    color?: string;
  };

  code?: {
    rich_text: RichTextItem[];
    language: string;
    caption?: RichTextItem[];
  };

  quote?: {
    rich_text: RichTextItem[];
    color?: string;
  };

  image?: {
    type: 'external' | 'file';
    external?: {
      url: string;
    };
    file?: {
      url: string;
      expiry_time?: string;
    };
    caption?: RichTextItem[];
  };

  bookmark?: {
    url: string;
    caption?: RichTextItem[];
  };

  callout?: {
    rich_text: RichTextItem[];
    icon?: {
      type: string;
      emoji?: string;
      external?: {
        url: string;
      };
      file?: {
        url: string;
        expiry_time?: string;
      };
    };
    color?: string;
  };

  table?: {
    table_width: number;
    has_column_header: boolean;
    has_row_header: boolean;
  };

  table_row?: {
    cells: RichTextItem[][];
  };

  embed?: {
    url: string;
    caption?: RichTextItem[];
  };

  video?: {
    type: 'external' | 'file';
    external?: {
      url: string;
    };
    file?: {
      url: string;
      expiry_time?: string;
    };
    caption?: RichTextItem[];
  };

  divider?: Record<string, never>;

  column_list?: Record<string, never>;

  column?: {
    ratio?: number;
  };

  link_preview?: {
    url: string;
  };

  synced_block?: {
    synced_from: null | {
      block_id: string;
    };
  };

  template?: {
    rich_text: RichTextItem[];
  };

  link_to_page?: {
    type: 'page_id' | 'database_id';
    page_id?: string;
    database_id?: string;
  };

  equation?: {
    expression: string;
  };

  breadcrumb?: Record<string, never>;

  table_of_contents?: {
    color?: string;
  };
}

/**
 * アプリケーション内で使用する整形済みのページデータを表す型
 */
export interface FormattedPage {
  /** ページのID */
  id: string;

  /** ページのタイトル */
  title: string;

  /** ページの概要 */
  summary: string;

  /** ページのスラッグ (URL用) */
  slug: string;

  /** 著者情報 (オプション) */
  author?: {
    name?: string;
    avatar_url?: string;
  };

  /** キーワード (オプション) */
  keywords?: string[];

  /** カテゴリ (オプション) */
  category?: string;

  /** タグ情報 */
  tags: {
    name: string;
    color: string;
  }[];

  /** ページの内容ブロック */
  blocks: NotionBlockWithChildren[];

  /** サムネイル画像 (オプション) */
  thumbnail?: {
    type: string;
    url: string;
  };

  /** 公開日 (ISO文字列) */
  date: string;

  /** 更新日 (ISO文字列) */
  updatedAt: string;

  /** ページの状態 (Draft/Public等) */
  status?: string;
}

/**
 * Notion APIからのページレスポンスを表す型
 */
export interface PageResponse {
  /** ページのID */
  id: string;

  /** ページのプロパティ */
  properties: PageData;

  /** 最終更新日時 */
  last_edited_time?: string;

  /** 作成日時 */
  created_time?: string;

  /** カバー画像 */
  cover?: {
    type: 'external' | 'file';
    external?: { url: string };
    file?: { url: string; expiry_time: string };
  };

  /** アイコン */
  icon?: {
    type: string;
    emoji?: string;
    external?: { url: string };
    file?: { url: string; expiry_time: string };
  };

  /** 親ページ情報 */
  parent?: {
    type: 'database_id' | 'page_id' | 'workspace';
    database_id?: string;
    page_id?: string;
  };
}

/**
 * Notionデータベースのページプロパティを表す型
 */
export interface PageData {
  /** キーワード */
  keywords?: {
    id: string;
    type: 'rich_text';
    rich_text: RichTextItem[];
  };

  /** 公開日 */
  date?: {
    id: string;
    type: 'date';
    date: {
      start: string;
      end: string | null;
      time_zone: string | null;
    };
  };

  /** サムネイル画像 */
  thumbnail?: {
    id: string;
    type: 'files';
    files: Array<{
      name?: string;
      type?: 'file' | 'external';
      file?: { url: string; expiry_time?: string };
      external?: { url: string };
    }>;
  };

  /** コンテンツタイプ */
  type?: {
    id: string;
    type: 'select';
    select: {
      id: string;
      name: string;
      color: string;
    } | null;
  };

  /** スラッグ (URL用) */
  slug?: {
    id: string;
    type: 'rich_text';
    rich_text: RichTextItem[];
  };

  /** カテゴリ */
  category?: {
    id: string;
    type: 'select';
    select: {
      id: string;
      name: string;
      color: string;
    } | null;
  };

  /** タグ */
  tags?: {
    id: string;
    type: 'multi_select';
    multi_select: Array<{
      id: string;
      name: string;
      color: string;
    }>;
  };

  /** 概要 */
  summary?: {
    id: string;
    type: 'rich_text';
    rich_text: RichTextItem[];
  };

  /** 更新日時 */
  updatedAt?: {
    id: string;
    type: 'last_edited_time';
    last_edited_time: string;
  };

  /** 著者 */
  author?: {
    id: string;
    type: 'people';
    people: Array<{
      object: string;
      id: string;
      name?: string;
      avatar_url?: string;
      email?: string;
    }>;
  };

  /** タイトル */
  title?: {
    id: string;
    type: 'title';
    title: RichTextItem[];
  };

  /** 公開状態 */
  status?: {
    id: string;
    type: 'select';
    select: {
      id: string;
      name: string;
      color: string;
    } | null;
  };

  // その他のプロパティがある場合
  [key: string]: unknown;
}

/**
 * データベースクエリの結果を表す型
 */
export interface DatabaseQueryResponse {
  /** 結果オブジェクト */
  object: 'list';

  /** 結果ページの配列 */
  results: PageResponse[];

  /** 次のページがある場合のカーソル */
  next_cursor: string | null;

  /** 結果が最後のページかどうか */
  has_more: boolean;
}

/**
 * Notionブロックコンポーネントのprops型
 */
export interface NotionBlockProps {
  /** レンダリングするブロック */
  block: NotionBlockWithChildren;
}

/**
 * 複数のNotionブロックをレンダリングするコンポーネントのprops型
 */
export interface NotionBlocksProps {
  /** レンダリングするブロックの配列 */
  blocks: NotionBlockWithChildren[];
}

/**
 * キャッシュ有効期限設定のための型
 */
export interface CacheConfig {
  /** キャッシュの有効期限 (ミリ秒) */
  ttl: number;

  /** キャッシュを再構築するタイミング（有効期限の何%経過時点か） */
  refreshThreshold?: number;
}
