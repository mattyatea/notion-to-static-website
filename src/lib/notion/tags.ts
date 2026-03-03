import type { FormattedPage } from '@/types/notion';
import { NOTION_DATABASE_ID, log } from './client';
import { getFromCacheOrFetch } from './cache';
import { formatPages, getFormattedDatabase } from './database';
import { queryNotionCollection } from './query';

/** タグでページをフィルタリングする */
export async function getPagesByTag(tag: string): Promise<FormattedPage[]> {
  // データベースIDをまず最初にチェック - 早期リターンによるエラー処理
  if (!NOTION_DATABASE_ID) {
    const error = new Error('NOTION_DATABASE_IDが設定されていません');
    log('error', error.message);
    throw error;
  }
  const dataSourceId = NOTION_DATABASE_ID;

  log('info', `Getting pages by tag: ${tag}`);

  // キャッシュから取得または新規フェッチ
  return getFromCacheOrFetch(`pages-by-tag:${tag}`, async () => {
    try {
      const response = await queryNotionCollection(dataSourceId, {
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
      });

      log('debug', `Found ${response.results.length} pages with tag: ${tag}`);
      return formatPages(response.results);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      log('error', `Failed to find pages by tag (${tag}):`, error);
      throw new Error(`タグでのフィルタリングに失敗しました: ${errorMsg}`);
    }
  });
}

/** すべてのタグを取得する */
export async function getAllTags(): Promise<string[]> {
  log('info', 'Getting all tags');

  // キャッシュから取得または新規フェッチ
  return getFromCacheOrFetch('all-tags', async () => {
    try {
      const pages = await getFormattedDatabase();
      const tagsSet = new Set<string>();

      pages.forEach((page) => {
        page.tags.forEach((tag) => {
          tagsSet.add(tag.name);
        });
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

/** カテゴリでページをフィルタリングする */
export async function getPagesByCategory(category: string): Promise<FormattedPage[]> {
  // データベースIDをまず最初にチェック - 早期リターンによるエラー処理
  if (!NOTION_DATABASE_ID) {
    const error = new Error('NOTION_DATABASE_IDが設定されていません');
    log('error', error.message);
    throw error;
  }
  const dataSourceId = NOTION_DATABASE_ID;

  log('info', `Getting pages by category: ${category}`);

  // キャッシュから取得または新規フェッチ
  return getFromCacheOrFetch(`pages-by-category:${category}`, async () => {
    try {
      const response = await queryNotionCollection(dataSourceId, {
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
      });

      log('debug', `Found ${response.results.length} pages with category: ${category}`);
      return formatPages(response.results);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      log('error', `Failed to find pages by category (${category}):`, error);
      throw new Error(`カテゴリでのフィルタリングに失敗しました: ${errorMsg}`);
    }
  });
}

/** すべてのカテゴリを取得する */
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

/** 検索キーワードでページを検索する */
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
