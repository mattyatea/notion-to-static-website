import { notion, NOTION_DATABASE_ID, log } from './client';
import { getFromCacheOrFetch } from './cache';
import { formatPage, getFormattedDatabase } from './database';
import type { PageResponse, NotionBlockWithChildren, FormattedPage } from '@/types/notion';
import { isPageResponse } from '@/types/notion';
import type { GetPageResponse } from '@notionhq/client/build/src/api-endpoints';
import { queryNotionCollection } from './query';

/**
 * Notionページの情報を取得する
 * @param pageId ページID
 * @returns ページ情報
 * @throws ページの取得に失敗した場合のエラー
 */
export async function getPage(pageId: string): Promise<PageResponse> {
  log('info', `Fetching page: ${pageId}`);

  // キャッシュから取得または新規フェッチ
  return getFromCacheOrFetch(`page:${pageId}`, async () => {
    try {
      const response: GetPageResponse = await notion.pages.retrieve({
        page_id: pageId,
      });

      if (!isPageResponse(response)) {
        throw new Error(`Notion APIから期待するページ形式を取得できませんでした (ID: ${pageId})`);
      }

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
 * スラッグからページを取得する
 * @param slug ページスラッグ
 * @returns 整形されたページ情報
 * @throws ページの取得に失敗した場合のエラー
 */
export async function getPageBySlug(slug: string): Promise<FormattedPage | null> {
  const dataSourceId = NOTION_DATABASE_ID;
  if (!dataSourceId) {
    const error = new Error('NOTION_DATABASE_IDが設定されていません');
    log('error', error.message);
    throw error;
  }

  const trimmedSlug = slug.trim();
  if (!trimmedSlug) {
    log('debug', 'Received empty slug when fetching page');
    return null;
  }

  const normalizedSlug = trimmedSlug.toLowerCase();
  const cacheKey = `page-by-slug:${normalizedSlug}`;
  log('info', `Getting page by slug`, { requested: slug, normalized: normalizedSlug });

  return getFromCacheOrFetch(cacheKey, async () => {
    try {
      const response = await queryNotionCollection(dataSourceId, {
        filter: {
          property: 'slug',
          rich_text: {
            equals: trimmedSlug,
          },
        },
      });

      let pageId: string | undefined;

      if (response.results.length > 0) {
        pageId = response.results[0].id;
        log('debug', `Found page with slug ${trimmedSlug}, ID: ${pageId}`);
      } else {
        log('debug', `No page found with slug ${trimmedSlug}, searching fallback lookup`);
        const formattedPages = await getFormattedDatabase();
        const fallback = formattedPages.find((page) => page.slug.toLowerCase() === normalizedSlug);
        if (fallback) {
          pageId = fallback.id;
          log('debug', `Found fallback page for slug ${normalizedSlug}, ID: ${pageId}`);
        }
      }

      if (!pageId) {
        return null;
      }

      return getFormattedPage(pageId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      log('error', `Failed to find page by slug (${slug}):`, error);
      throw new Error(`スラッグからページの取得に失敗しました: ${errorMsg}`);
    }
  });
}
