/**
 * Notion APIとの連携を行うライブラリ
 * @file Notion APIを使用してページとブロックを取得・整形するためのユーティリティ関数を提供します
 */

import { Client } from '@notionhq/client';
import type {
  CacheConfig,
  DatabaseQueryResponse,
  FormattedPage,
  NotionBlockWithChildren,
  PageData,
  PageResponse,
} from '../types/notion';
import 'dotenv/config';

// 環境変数から情報を取得
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

// キャッシュ設定のデフォルト値
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5分間
  refreshThreshold: 0.8, // 有効期限の80%経過時点でバックグラウンド更新
};

// キャッシュオブジェクト
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const cache: Record<string, CacheItem<unknown>> = {};

/**
 * Notion API クライアントの初期化
 */
const notion = new Client({
  auth: NOTION_API_KEY,
});

/**
 * ログ出力のラッパー関数
 * @param level ログレベル
 * @param message ログメッセージ
 * @param data 追加データ
 */
function log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: unknown) {
  if (process.env.NODE_ENV !== 'development') {
    return; // 開発環境でのみデバッグログを出力
  }
  const timestamp = new Date().toISOString();
  const prefix = `[Notion API] ${timestamp}`;

  switch (level) {
    case 'info':
      // console.info(`${prefix} INFO: ${message}`, data ? data : "");
      break;
    case 'warn':
      console.warn(`${prefix} WARNING: ${message}`, data ? data : '');
      break;
    case 'error':
      console.error(`${prefix} ERROR: ${message}`, data ? data : '');
      break;
    case 'debug':
      // if (process.env.NODE_ENV === "development") {
      //   console.debug(`${prefix} DEBUG: ${message}`, data ? data : "");
      // }
      break;
  }
}

/**
 * キャッシュからデータを取得または更新する汎用関数
 * @param key キャッシュキー
 * @param fetchFn データ取得用の非同期関数
 * @param config キャッシュ設定
 * @returns 取得したデータ
 */
async function getFromCacheOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  config: CacheConfig = DEFAULT_CACHE_CONFIG
): Promise<T> {
  const now = Date.now();
  const cachedItem = cache[key];

  // キャッシュにデータがある場合
  if (cachedItem) {
    // 有効期限内の場合はキャッシュから返す
    if (now < cachedItem.expiresAt) {
      // リフレッシュのしきい値を超えている場合は、バックグラウンドで更新
      if (now > cachedItem.timestamp + config.ttl * (config.refreshThreshold || 0.8)) {
        log('debug', `Refreshing cache in background: ${key}`);
        // バックグラウンドで非同期に更新（await不要）
        fetchFn()
          .then((data) => {
            cache[key] = {
              data,
              timestamp: Date.now(),
              expiresAt: Date.now() + config.ttl,
            };
            log('debug', `Cache refreshed in background: ${key}`);
          })
          .catch((err) => {
            log('warn', `Failed to refresh cache in background: ${key}`, err);
          });
      }
      return cachedItem.data as T;
    }
  }

  // キャッシュにない場合、または有効期限切れの場合は新しく取得
  try {
    log('debug', `Fetching fresh data for: ${key}`);
    const data = await fetchFn();

    // 取得したデータをキャッシュに保存
    cache[key] = {
      data,
      timestamp: now,
      expiresAt: now + config.ttl,
    };

    return data;
  } catch (error) {
    log('error', `Failed to fetch data for: ${key}`, error);

    // エラーが発生しても、期限切れのキャッシュがあれば、それを返す（緊急フォールバック）
    if (cachedItem) {
      log('warn', `Using expired cache as fallback for: ${key}`);
      return cachedItem.data as T;
    }

    throw error;
  }
}

/**
 * キャッシュをクリアする関数
 * @param keyPrefix 特定のプレフィックスを持つキーのみをクリアする場合に指定
 */
export function clearCache(keyPrefix?: string): void {
  if (keyPrefix) {
    // 特定のプレフィックスを持つキーのみをクリア
    Object.keys(cache).forEach((key) => {
      if (key.startsWith(keyPrefix)) {
        delete cache[key];
      }
    });
    log('info', `Cleared cache with prefix: ${keyPrefix}`);
  } else {
    // すべてのキャッシュをクリア
    Object.keys(cache).forEach((key) => {
      delete cache[key];
    });
    log('info', 'Cleared all cache');
  }
}

/**
 * ページオブジェクトをフォーマット済みのページに変換する
 * @param page ページオブジェクト
 * @param blocks ブロック情報（オプション）
 * @returns フォーマット済みのページ
 */
export function formatPage(page: PageResponse, blocks?: NotionBlockWithChildren[]): FormattedPage {
  const properties = page.properties as PageData;
  log('debug', `Formatting page: ${page.id}`, {
    title: properties.title?.title[0]?.plain_text || '無題',
  });

  // タイトルの取得（適切なプロパティの識別を試みる）
  let title = '無題';

  // タイトルプロパティを探す
  if (properties.title?.title?.[0]?.plain_text) {
    title = properties.title.title[0].plain_text;
  }
  // スラッグの取得（適切なプロパティの識別を試みる）
  let slug = page.id;
  if (properties.slug?.rich_text?.[0]?.plain_text) {
    slug = properties.slug.rich_text[0].plain_text;
  }

  // サムネイルの取得
  let thumbnail = undefined;
  if (properties.thumbnail?.files?.[0]) {
    const thumb = properties.thumbnail.files[0];
    thumbnail = {
      type: thumb.type || 'external',
      url: thumb.file?.url || thumb.external?.url || '',
    };
  } else if (page.cover) {
    thumbnail = {
      type: page.cover.type,
      url:
        page.cover.type === 'external'
          ? page.cover.external?.url || ''
          : page.cover.file?.url || '',
    };
  }

  // 日付の取得
  const dateStr = properties.date?.date?.start || page.created_time || new Date().toISOString();

  // 更新日の取得
  const updatedAtStr = properties.updatedAt?.last_edited_time || page.last_edited_time || dateStr;

  // タグの取得
  const tags =
    properties.tags?.multi_select.map((tag: { name: string; color: string }) => ({
      name: tag.name,
      color: tag.color,
    })) || [];

  // 著者情報の取得
  let author = undefined;
  if (properties.author?.people?.[0]) {
    const personData = properties.author.people[0];
    author = {
      name: personData.name,
      avatar_url: personData.avatar_url,
    };
  }

  // カテゴリの取得
  const category = properties.category?.select?.name;

  // ステータスの取得
  const status = properties.status?.select?.name;

  // 概要の取得
  const summary = properties.summary?.rich_text?.[0]?.plain_text || '';

  // キーワードの取得
  const keywords = properties.keywords?.rich_text?.[0]?.plain_text
    ? properties.keywords.rich_text[0].plain_text.split(',').map((k) => k.trim())
    : [];

  return {
    id: page.id,
    title,
    summary,
    slug,
    author,
    keywords,
    category,
    tags,
    blocks: blocks || [],
    thumbnail,
    date: new Date(dateStr).toISOString(),
    updatedAt: new Date(updatedAtStr).toISOString(),
    status,
  };
}

/**
 * 複数のページをフォーマット済みのページリストに変換する
 * @param pages ページオブジェクトの配列
 * @returns フォーマット済みのページの配列
 */
export function formatPages(pages: PageResponse[]): FormattedPage[] {
  log('debug', `Formatting ${pages.length} pages`);
  return pages.map((page) => formatPage(page));
}

/**
 * Notionページを取得する
 * @param pageId ページID
 * @returns ページ情報
 * @throws ページの取得に失敗した場合のエラー
 */
export async function getPage(pageId: string): Promise<PageResponse> {
  log('info', `Fetching page: ${pageId}`);

  // キャッシュから取得または新規フェッチ
  return getFromCacheOrFetch(`page:${pageId}`, async () => {
    try {
      const response = (await notion.pages.retrieve({
        page_id: pageId,
      })) as unknown as PageResponse;

      log('debug', `Successfully fetched page: ${pageId}`);
      return response;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      log('error', `Failed to fetch page ${pageId}:`, error);

      // エラー内容に応じた具体的なエラーメッセージを生成
      let detailedMessage = `ページの取得に失敗しました: ${errorMsg}`;

      if (errorMsg.includes('404')) {
        detailedMessage = `ページが見つかりません (ID: ${pageId})`;
      } else if (errorMsg.includes('401') || errorMsg.includes('403')) {
        detailedMessage = `ページへのアクセス権限がありません (ID: ${pageId}). APIキーが正しく設定されていることを確認してください。`;
      } else if (errorMsg.includes('429')) {
        detailedMessage = `API利用制限に達しました。しばらく待ってから再試行してください。`;
      }

      throw new Error(detailedMessage);
    }
  });
}

/**
 * ページのブロック内容を取得する
 * @param blockId ブロックID（通常はページID）
 * @returns ブロックリスト
 * @throws ブロックの取得に失敗した場合のエラー
 */
export async function getBlocks(blockId: string): Promise<NotionBlockWithChildren[]> {
  log('info', `Fetching blocks for: ${blockId}`);

  // キャッシュから取得または新規フェッチ
  return getFromCacheOrFetch(`blocks:${blockId}`, async () => {
    try {
      // まずは基本的なブロックをすべて取得
      let allBlocks: NotionBlockWithChildren[] = [];
      let hasMore = true;
      let cursor: string | undefined;

      while (hasMore) {
        const response = await notion.blocks.children.list({
          block_id: blockId,
          ...(cursor ? { start_cursor: cursor } : {}),
          page_size: 100, // 最大値
        });

        const blocks = response.results as NotionBlockWithChildren[];
        allBlocks = [...allBlocks, ...blocks];

        hasMore = response.has_more;
        cursor = response.next_cursor || undefined;
      }

      log('debug', `Fetched ${allBlocks.length} blocks for ${blockId}`);

      // 子ブロックを持つブロックを識別
      const blocksWithChildren = allBlocks.filter(
        (block) => 'has_children' in block && block.has_children
      );

      // 子ブロックを取得（並列処理で効率化）
      if (blocksWithChildren.length > 0) {
        log('debug', `Fetching children for ${blocksWithChildren.length} blocks`);

        await Promise.all(
          blocksWithChildren.map(async (block) => {
            block.children = await getBlocks(block.id);
          })
        );
      }

      return allBlocks;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      log('error', `Failed to fetch blocks for ${blockId}:`, error);

      // エラー内容に応じた具体的なエラーメッセージを生成
      let detailedMessage = `ブロックの取得に失敗しました: ${errorMsg}`;

      if (errorMsg.includes('404')) {
        detailedMessage = `ブロックが見つかりません (ID: ${blockId})`;
      } else if (errorMsg.includes('401') || errorMsg.includes('403')) {
        detailedMessage = `ブロックへのアクセス権限がありません (ID: ${blockId})`;
      } else if (errorMsg.includes('429')) {
        detailedMessage = `API利用制限に達しました。しばらく待ってから再試行してください。`;
      }

      throw new Error(detailedMessage);
    }
  });
}

/**
 * Notionページの内容を整形して返す
 * @param pageId ページID
 * @param fetchBlocks ブロックを取得するかどうか
 * @returns 整形されたページ情報
 * @throws ページの整形に失敗した場合のエラー
 */
export async function getFormattedPage(pageId: string, fetchBlocks = true): Promise<FormattedPage> {
  log('info', `Getting formatted page: ${pageId} (with blocks: ${fetchBlocks})`);

  // キャッシュから取得または新規フェッチ
  return getFromCacheOrFetch(`formatted-page:${pageId}:${fetchBlocks}`, async () => {
    try {
      const page = await getPage(pageId);
      let blocks: NotionBlockWithChildren[] = [];

      if (fetchBlocks) {
        blocks = await getBlocks(pageId);
      }

      return formatPage(page, blocks);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      log('error', `Failed to format page ${pageId}:`, error);
      throw new Error(`ページの整形に失敗しました: ${errorMsg}`);
    }
  });
}

/**
 * データベースからページリストを整形して取得する
 * @param filterByStatus 特定のステータスでフィルタリングするかどうか
 * @param status フィルタリングするステータス (デフォルト: "Public")
 * @returns 整形されたページリスト
 * @throws データベースの取得・整形に失敗した場合のエラー
 */
export async function getFormattedDatabase(
  filterByStatus = true,
  status = 'Public'
): Promise<FormattedPage[]> {
  // データベースIDをまず最初にチェック - 早期リターンによるエラー処理
  if (!process.env.NOTION_DATABASE_ID) {
    const error = new Error('NOTION_DATABASE_IDが設定されていません');
    log('error', error.message);
    throw error;
  }

  log(
    'info',
    `Getting formatted database (filter by status: ${filterByStatus}, status: ${status})`
  );

  // キャッシュから取得または新規フェッチ
  return getFromCacheOrFetch(`formatted-database:${filterByStatus}:${status}`, async () => {
    try {
      // データベースIDをもう一度チェック (getFromCacheOrFetchの中でも)
      if (!process.env.NOTION_DATABASE_ID) {
        throw new Error('NOTION_DATABASE_IDが設定されていません');
      }

      // クエリオプションを定義
      interface QueryOptions {
        database_id: string;
        sorts: {
          property: string;
          direction: 'ascending' | 'descending';
        }[];
        filter?: {
          property: string;
          select: {
            equals: string;
          };
        };
      }

      const queryOptions: QueryOptions = {
        database_id: process.env.NOTION_DATABASE_ID,
        sorts: [
          {
            property: 'date',
            direction: 'descending',
          },
        ],
      };

      // 公開されているページのみ取得するフィルター
      if (filterByStatus) {
        queryOptions.filter = {
          property: 'status',
          select: {
            equals: status,
          },
        };
      }

      const response = (await notion.databases.query(
        queryOptions
      )) as unknown as DatabaseQueryResponse;
      log('debug', `Found ${response.results.length} pages in database`);

      return formatPages(response.results);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      log('error', 'Failed to format database:', error);

      // エラー内容に応じた具体的なエラーメッセージを生成
      let detailedMessage = `データベースの取得・整形に失敗しました: ${errorMsg}`;

      if (errorMsg.includes('404')) {
        detailedMessage = `データベースが見つかりません (ID: ${NOTION_DATABASE_ID})`;
      } else if (errorMsg.includes('401') || errorMsg.includes('403')) {
        detailedMessage = `データベースへのアクセス権限がありません (ID: ${NOTION_DATABASE_ID})`;
      }

      throw new Error(detailedMessage);
    }
  });
}

/**
 * スラッグからページを取得する
 * @param slug ページスラッグ
 * @returns 整形されたページ情報
 * @throws ページの取得に失敗した場合のエラー
 */
export async function getPageBySlug(slug: string): Promise<FormattedPage | null> {
  // データベースIDをまず最初にチェック - 早期リターンによるエラー処理
  if (!process.env.NOTION_DATABASE_ID) {
    const error = new Error('NOTION_DATABASE_IDが設定されていません');
    log('error', error.message);
    throw error;
  }

  log('info', `Getting page by slug: ${slug}`);

  // キャッシュから取得または新規フェッチ
  return getFromCacheOrFetch(`page-by-slug:${slug}`, async () => {
    try {
      // データベースIDをもう一度チェック (getFromCacheOrFetchの中でも)
      if (!process.env.NOTION_DATABASE_ID) {
        throw new Error('NOTION_DATABASE_IDが設定されていません');
      }

      const response = (await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        filter: {
          property: 'slug',
          rich_text: {
            equals: slug,
          },
        },
      })) as unknown as DatabaseQueryResponse;

      if (response.results.length === 0) {
        log('debug', `No page found with slug: ${slug}`);
        return null;
      }

      const pageId = response.results[0].id;
      log('debug', `Found page with slug ${slug}, ID: ${pageId}`);

      const blocks = await getBlocks(pageId);
      const page = await getPage(pageId);

      return formatPage(page, blocks);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      log('error', `Failed to find page by slug (${slug}):`, error);
      throw new Error(`スラッグからページの取得に失敗しました: ${errorMsg}`);
    }
  });
}

/**
 * タグでページをフィルタリングする
 * @param tag フィルタリングするタグ
 * @returns 整形されたページリスト
 * @throws タグでのフィルタリングに失敗した場合のエラー
 */
export async function getPagesByTag(tag: string): Promise<FormattedPage[]> {
  // データベースIDをまず最初にチェック - 早期リターンによるエラー処理
  if (!process.env.NOTION_DATABASE_ID) {
    const error = new Error('NOTION_DATABASE_IDが設定されていません');
    log('error', error.message);
    throw error;
  }

  log('info', `Getting pages by tag: ${tag}`);

  // キャッシュから取得または新規フェッチ
  return getFromCacheOrFetch(`pages-by-tag:${tag}`, async () => {
    try {
      // データベースIDをもう一度チェック (getFromCacheOrFetchの中でも)
      if (!process.env.NOTION_DATABASE_ID) {
        throw new Error('NOTION_DATABASE_IDが設定されていません');
      }

      const response = (await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        filter: {
          property: 'tags',
          multi_select: {
            contains: tag,
          },
        },
        sorts: [
          {
            property: 'date',
            direction: 'descending',
          },
        ],
      })) as unknown as DatabaseQueryResponse;

      log('debug', `Found ${response.results.length} pages with tag: ${tag}`);
      return formatPages(response.results);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      log('error', `Failed to find pages by tag (${tag}):`, error);
      throw new Error(`タグでのフィルタリングに失敗しました: ${errorMsg}`);
    }
  });
}

/**
 * すべてのタグを取得する
 * @returns タグのリスト
 * @throws タグの取得に失敗した場合のエラー
 */
export async function getAllTags(): Promise<string[]> {
  log('info', 'Getting all tags');

  // キャッシュから取得または新規フェッチ
  return getFromCacheOrFetch('all-tags', async () => {
    try {
      const pages = await getFormattedDatabase();
      const tagsSet = new Set<string>();

      pages.forEach((page) => {
        page.tags.forEach((tag) => tagsSet.add(tag.name));
      });

      const tags = Array.from(tagsSet).sort();
      log('debug', `Found ${tags.length} unique tags`);

      return tags;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      log('error', 'Failed to get all tags:', error);
      throw new Error(`すべてのタグの取得に失敗しました: ${errorMsg}`);
    }
  });
}

/**
 * カテゴリでページをフィルタリングする
 * @param category フィルタリングするカテゴリ
 * @returns 整形されたページリスト
 * @throws カテゴリでのフィルタリングに失敗した場合のエラー
 */
export async function getPagesByCategory(category: string): Promise<FormattedPage[]> {
  // データベースIDをまず最初にチェック - 早期リターンによるエラー処理
  if (!process.env.NOTION_DATABASE_ID) {
    const error = new Error('NOTION_DATABASE_IDが設定されていません');
    log('error', error.message);
    throw error;
  }

  log('info', `Getting pages by category: ${category}`);

  // キャッシュから取得または新規フェッチ
  return getFromCacheOrFetch(`pages-by-category:${category}`, async () => {
    try {
      // データベースIDをもう一度チェック (getFromCacheOrFetchの中でも)
      if (!process.env.NOTION_DATABASE_ID) {
        throw new Error('NOTION_DATABASE_IDが設定されていません');
      }

      const response = (await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        filter: {
          property: 'category',
          select: {
            equals: category,
          },
        },
        sorts: [
          {
            property: 'date',
            direction: 'descending',
          },
        ],
      })) as unknown as DatabaseQueryResponse;

      log('debug', `Found ${response.results.length} pages with category: ${category}`);
      return formatPages(response.results);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      log('error', `Failed to find pages by category (${category}):`, error);
      throw new Error(`カテゴリでのフィルタリングに失敗しました: ${errorMsg}`);
    }
  });
}

/**
 * すべてのカテゴリを取得する
 * @returns カテゴリのリスト
 * @throws カテゴリの取得に失敗した場合のエラー
 */
export async function getAllCategories(): Promise<string[]> {
  log('info', 'Getting all categories');

  // キャッシュから取得または新規フェッチ
  return getFromCacheOrFetch('all-categories', async () => {
    try {
      const pages = await getFormattedDatabase();
      const categoriesSet = new Set<string>();

      pages.forEach((page) => {
        if (page.category) {
          categoriesSet.add(page.category);
        }
      });

      const categories = Array.from(categoriesSet).sort();
      log('debug', `Found ${categories.length} unique categories`);

      return categories;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      log('error', 'Failed to get all categories:', error);
      throw new Error(`すべてのカテゴリの取得に失敗しました: ${errorMsg}`);
    }
  });
}

/**
 * 検索キーワードでページを検索する
 * @param query 検索キーワード
 * @returns 整形されたページリスト
 * @throws 検索に失敗した場合のエラー
 */
export async function searchPages(query: string): Promise<FormattedPage[]> {
  if (!query.trim()) {
    return [];
  }

  log('info', `Searching pages with query: ${query}`);

  try {
    // 検索はキャッシュしない（常に最新の検索結果を取得する）
    const allPages = await getFormattedDatabase(false);

    // タイトル、概要、タグの中から検索
    const lowerQuery = query.toLowerCase();
    const results = allPages.filter((page) => {
      // タイトル検索
      if (page.title.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // 概要検索
      if (page.summary.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // タグ検索
      if (page.tags.some((tag) => tag.name.toLowerCase().includes(lowerQuery))) {
        return true;
      }

      // カテゴリ検索
      const categoryMatch = Boolean(
        page.category && page.category.toLowerCase().includes(lowerQuery)
      );
      if (categoryMatch) return true;

      return false;
    });

    log('debug', `Found ${results.length} pages matching query: ${query}`);
    return results;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '不明なエラー';
    log('error', `Failed to search pages (${query}):`, error);
    throw new Error(`ページの検索に失敗しました: ${errorMsg}`);
  }
}
