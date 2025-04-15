import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearCache,
  formatPage,
  formatPages,
  getAllCategories,
  getAllTags,
  getBlocks,
  getFormattedDatabase,
  getFormattedPage,
  getPage,
  getPageBySlug,
  getPagesByCategory,
  getPagesByTag,
  searchPages,
} from './notion';
import {
  mockBlocks,
  mockBlocksWithChildren,
  mockDatabaseQueryResponse,
  mockMultiPageResponse,
  mockPageResponse,
} from '../test/mocks/notionData';

/**
 * Notion APIクライアントのテスト
 */

// グローバルモックから取得
// setup.tsで定義されたモック関数を使用
// @ts-expect-error グローバルモックは型定義されていないため
const mockRetrieve = global.mockRetrieve;
// @ts-expect-error setup.tsでvitest環境に追加されたモック関数
const mockListBlocks = global.mockListBlocks;
// @ts-expect-error グローバルモック関数は型定義ファイルにないため
const mockQueryDB = global.mockQueryDB;

describe('Notion APIクライアント', () => {
  beforeEach(() => {
    // テスト前にモックをリセット
    mockRetrieve.mockReset();
    mockListBlocks.mockReset();
    mockQueryDB.mockReset();

    // 環境変数を設定
    process.env.NOTION_DATABASE_ID = 'test-database-id';
    process.env.NOTION_API_KEY = 'test-api-key';

    // キャッシュをクリア
    clearCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('formatPage', () => {
    it('ページをフォーマットできること', () => {
      const formattedPage = formatPage(mockPageResponse);

      expect(formattedPage.id).toBe(mockPageResponse.id);
      expect(formattedPage.title).toBe('テストページ');
      expect(formattedPage.slug).toBe('test-page');
      expect(formattedPage.date).toBeDefined();
      expect(formattedPage.tags).toHaveLength(2);
      expect(formattedPage.tags[0].name).toBe('テスト');
    });

    it('タイトルがない場合でもエラーにならないこと', () => {
      // タイトルプロパティを空にしたモックを作成
      const pageWithoutTitle = {
        ...mockPageResponse,
        properties: {
          ...mockPageResponse.properties,
          title: undefined,
        },
      };

      const formattedPage = formatPage(pageWithoutTitle);
      expect(formattedPage.title).toBe('無題');
    });

    it('ブロックを含めてページをフォーマットできること', () => {
      const formattedPage = formatPage(mockPageResponse, mockBlocks);

      expect(formattedPage.blocks).toHaveLength(mockBlocks.length);
      expect(formattedPage.blocks[0].type).toBe('paragraph');
    });

    it('ネストされたブロックを処理できること', () => {
      const formattedPage = formatPage(mockPageResponse, mockBlocksWithChildren);

      expect(formattedPage.blocks).toHaveLength(mockBlocksWithChildren.length);
      // トグルブロックがあることを確認
      const toggleBlock = formattedPage.blocks.find((block) => block.type === 'toggle');
      expect(toggleBlock).toBeDefined();
      expect(toggleBlock?.children).toHaveLength(1);
    });

    it('サムネイルが正しく処理されること', () => {
      const formattedPage = formatPage(mockPageResponse);

      expect(formattedPage.thumbnail).toBeDefined();
      expect(formattedPage.thumbnail?.type).toBe('external');
      expect(formattedPage.thumbnail?.url).toBe('https://example.com/cover.jpg');
    });
  });

  describe('formatPages', () => {
    it('複数のページをフォーマットできること', () => {
      const pages = [mockPageResponse, { ...mockPageResponse, id: 'page-2' }];
      const formattedPages = formatPages(pages);

      expect(formattedPages).toHaveLength(2);
      expect(formattedPages[0].id).toBe('page-id-123');
      expect(formattedPages[1].id).toBe('page-2');
    });

    it('空の配列が渡された場合は空の配列を返すこと', () => {
      const formattedPages = formatPages([]);
      expect(formattedPages).toHaveLength(0);
    });
  });

  describe('getPage', () => {
    it('ページIDからページを取得できること', async () => {
      mockRetrieve.mockResolvedValue(mockPageResponse);

      const page = await getPage('page-id-123');

      expect(page).toEqual(mockPageResponse);
      expect(mockRetrieve).toHaveBeenCalledWith({
        page_id: 'page-id-123',
      });
    });

    it('404エラーが発生した場合に適切なエラーメッセージを返すこと', async () => {
      mockRetrieve.mockRejectedValue(new Error('404 Not Found'));

      await expect(getPage('not-exist')).rejects.toThrow('ページが見つかりません');
    });

    it('認証エラーが発生した場合に適切なエラーメッセージを返すこと', async () => {
      mockRetrieve.mockRejectedValue(new Error('401 Unauthorized'));

      await expect(getPage('unauthorized')).rejects.toThrow('ページへのアクセス権限がありません');
    });

    it('レート制限エラーが発生した場合に適切なエラーメッセージを返すこと', async () => {
      mockRetrieve.mockRejectedValue(new Error('429 Too Many Requests'));

      await expect(getPage('rate-limited')).rejects.toThrow('API利用制限に達しました');
    });

    it('同じページIDで2回呼び出すとキャッシュから返されること', async () => {
      mockRetrieve.mockResolvedValue(mockPageResponse);

      // 1回目の呼び出し
      await getPage('cache-test');

      // 2回目の呼び出し
      await getPage('cache-test');

      // ページ取得は1回だけ行われるはず
      expect(mockRetrieve).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBlocks', () => {
    it('ブロックIDからブロックリストを取得できること', async () => {
      mockListBlocks.mockResolvedValue({
        results: mockBlocks,
        has_more: false,
      });

      const blocks = await getBlocks('block-id-123');

      expect(blocks).toEqual(mockBlocks);
      expect(mockListBlocks).toHaveBeenCalledWith({
        block_id: 'block-id-123',
        start_cursor: undefined,
        page_size: 100,
      });
    });

    it('子ブロックがある場合に再帰的に取得できること', async () => {
      // 最初の呼び出しでは親ブロックを返す
      mockListBlocks.mockResolvedValueOnce({
        results: [
          {
            id: 'parent-block',
            type: 'toggle',
            has_children: true,
            toggle: {
              rich_text: [{ plain_text: '親ブロック', type: 'text' }],
            },
          },
        ],
        has_more: false,
      });

      // 2回目の呼び出しでは子ブロックを返す
      mockListBlocks.mockResolvedValueOnce({
        results: [
          {
            id: 'child-block',
            type: 'paragraph',
            has_children: false,
            paragraph: {
              rich_text: [{ plain_text: '子ブロック', type: 'text' }],
            },
          },
        ],
        has_more: false,
      });

      const blocks = await getBlocks('parent-block-id');

      expect(blocks).toHaveLength(1);
      expect(blocks[0].id).toBe('parent-block');
      expect(blocks[0].has_children).toBe(true);
      expect(mockListBlocks).toHaveBeenCalledTimes(2);
    });

    it('ページネーションがある場合に複数回の呼び出しができること', async () => {
      // 最初のページ
      mockListBlocks.mockResolvedValueOnce({
        results: [mockBlocks[0], mockBlocks[1]],
        has_more: true,
        next_cursor: 'next-page',
      });

      // 2ページ目
      mockListBlocks.mockResolvedValueOnce({
        results: [mockBlocks[2], mockBlocks[3]],
        has_more: false,
      });

      const blocks = await getBlocks('paginated-blocks');

      expect(blocks).toHaveLength(4);
      expect(mockListBlocks).toHaveBeenCalledTimes(2);
      expect(mockListBlocks).toHaveBeenNthCalledWith(1, {
        block_id: 'paginated-blocks',
        start_cursor: undefined,
        page_size: 100,
      });
      expect(mockListBlocks).toHaveBeenNthCalledWith(2, {
        block_id: 'paginated-blocks',
        start_cursor: 'next-page',
        page_size: 100,
      });
    });

    it('エラーが発生した場合に適切なエラーメッセージを返すこと', async () => {
      mockListBlocks.mockRejectedValue(new Error('404 Not Found'));

      await expect(getBlocks('not-exist')).rejects.toThrow('ブロックが見つかりません');
    });
  });

  describe('getFormattedPage', () => {
    it('ページIDからフォーマット済みページを取得できること', async () => {
      mockRetrieve.mockResolvedValue(mockPageResponse);
      mockListBlocks.mockResolvedValue({
        results: mockBlocks,
        has_more: false,
      });

      const page = await getFormattedPage('page-id-123');

      expect(page.id).toBe('page-id-123');
      expect(page.title).toBe('テストページ');
      expect(page.blocks).toHaveLength(mockBlocks.length);
      expect(mockRetrieve).toHaveBeenCalledTimes(1);
      expect(mockListBlocks).toHaveBeenCalledTimes(1);
    });

    it('fetchBlocks=falseを指定するとブロックを取得しないこと', async () => {
      mockRetrieve.mockResolvedValue(mockPageResponse);

      const page = await getFormattedPage('page-id-123', false);

      expect(page.id).toBe('page-id-123');
      expect(page.blocks).toHaveLength(0);
      expect(mockRetrieve).toHaveBeenCalledTimes(1);
      expect(mockListBlocks).not.toHaveBeenCalled();
    });

    it('エラーが発生した場合に適切なエラーメッセージを返すこと', async () => {
      mockRetrieve.mockRejectedValue(new Error('Error getting page'));

      await expect(getFormattedPage('error-page')).rejects.toThrow('ページの整形に失敗しました');
    });
  });

  describe('getFormattedDatabase', () => {
    it('データベースからフォーマット済みページリストを取得できること', async () => {
      mockQueryDB.mockResolvedValue(mockMultiPageResponse);

      const pages = await getFormattedDatabase();

      expect(pages).toHaveLength(2);
      expect(pages[0].title).toBe('テストページ');
      expect(pages[1].title).toBe('別のテストページ');
      expect(mockQueryDB).toHaveBeenCalledWith({
        database_id: 'test-database-id',
        sorts: [{ property: 'date', direction: 'descending' }],
        filter: { property: 'status', select: { equals: 'Public' } },
      });
    });

    it('filterByStatus=falseを指定するとフィルタリングしないこと', async () => {
      mockQueryDB.mockResolvedValue(mockMultiPageResponse);

      await getFormattedDatabase(false);

      expect(mockQueryDB).toHaveBeenCalledWith({
        database_id: 'test-database-id',
        sorts: [{ property: 'date', direction: 'descending' }],
      });
    });

    it('データベースIDが設定されていない場合にエラーを投げること', async () => {
      process.env.NOTION_DATABASE_ID = undefined;

      await expect(getFormattedDatabase()).rejects.toThrow(
        'NOTION_DATABASE_IDが設定されていません'
      );

      // テスト後に元に戻す
      process.env.NOTION_DATABASE_ID = 'test-database-id';
    });

    it('エラーが発生した場合に適切なエラーメッセージを返すこと', async () => {
      mockQueryDB.mockRejectedValue(new Error('404 Not Found'));

      await expect(getFormattedDatabase()).rejects.toThrow('データベースが見つかりません');
    });
  });

  describe('getPageBySlug', () => {
    it('スラッグからページを取得できること', async () => {
      mockQueryDB.mockResolvedValue({
        results: [mockPageResponse],
        has_more: false,
      });
      mockRetrieve.mockResolvedValue(mockPageResponse);
      mockListBlocks.mockResolvedValue({
        results: mockBlocks,
        has_more: false,
      });

      const page = await getPageBySlug('test-page');

      expect(page).not.toBeNull();
      expect(page?.title).toBe('テストページ');
      expect(page?.slug).toBe('test-page');
      expect(mockQueryDB).toHaveBeenCalledWith({
        database_id: 'test-database-id',
        filter: {
          property: 'slug',
          rich_text: { equals: 'test-page' },
        },
      });
    });

    it('該当するページがない場合にnullを返すこと', async () => {
      mockQueryDB.mockResolvedValue({
        results: [],
        has_more: false,
      });

      const page = await getPageBySlug('non-existent-page');

      expect(page).toBeNull();
    });

    it('データベースIDが設定されていない場合にエラーを投げること', async () => {
      process.env.NOTION_DATABASE_ID = undefined;

      await expect(getPageBySlug('test-page')).rejects.toThrow(
        'NOTION_DATABASE_IDが設定されていません'
      );

      // テスト後に元に戻す
      process.env.NOTION_DATABASE_ID = 'test-database-id';
    });
  });

  describe('getPagesByTag', () => {
    it('タグでページをフィルタリングできること', async () => {
      mockQueryDB.mockResolvedValue(mockMultiPageResponse);

      const pages = await getPagesByTag('テスト');

      expect(pages).toHaveLength(2);
      expect(mockQueryDB).toHaveBeenCalledWith({
        database_id: 'test-database-id',
        filter: {
          property: 'tags',
          multi_select: { contains: 'テスト' },
        },
        sorts: [{ property: 'date', direction: 'descending' }],
      });
    });

    it('データベースIDが設定されていない場合にエラーを投げること', async () => {
      process.env.NOTION_DATABASE_ID = undefined;

      await expect(getPagesByTag('テスト')).rejects.toThrow(
        'NOTION_DATABASE_IDが設定されていません'
      );

      // テスト後に元に戻す
      process.env.NOTION_DATABASE_ID = 'test-database-id';
    });
  });

  describe('getPagesByCategory', () => {
    it('カテゴリでページをフィルタリングできること', async () => {
      mockQueryDB.mockResolvedValue(mockMultiPageResponse);

      const pages = await getPagesByCategory('プログラミング');

      expect(pages).toHaveLength(2);
      expect(mockQueryDB).toHaveBeenCalledWith({
        database_id: 'test-database-id',
        filter: {
          property: 'category',
          select: { equals: 'プログラミング' },
        },
        sorts: [{ property: 'date', direction: 'descending' }],
      });
    });

    it('データベースIDが設定されていない場合にエラーを投げること', async () => {
      process.env.NOTION_DATABASE_ID = undefined;

      await expect(getPagesByCategory('プログラミング')).rejects.toThrow(
        'NOTION_DATABASE_IDが設定されていません'
      );

      // テスト後に元に戻す
      process.env.NOTION_DATABASE_ID = 'test-database-id';
    });
  });

  describe('clearCache', () => {
    it('キャッシュをクリアできること', async () => {
      mockRetrieve.mockResolvedValue(mockPageResponse);

      // 最初の呼び出し
      await getPage('cache-test');

      // キャッシュをクリア
      clearCache();

      // 再度呼び出し
      await getPage('cache-test');

      // 2回APIが呼ばれることを確認
      expect(mockRetrieve).toHaveBeenCalledTimes(2);
    });

    it('プレフィックスを指定してキャッシュの一部だけをクリアできること', async () => {
      mockRetrieve.mockResolvedValue(mockPageResponse);
      mockQueryDB.mockResolvedValue(mockDatabaseQueryResponse);

      // 異なるキャッシュキーを持つ関数を呼び出し
      await getPage('page-1');
      await getFormattedDatabase();

      // page:プレフィックスのキャッシュだけをクリア
      clearCache('page:');

      // 再度呼び出し
      await getPage('page-1');
      await getFormattedDatabase();

      // pageの取得は2回、データベースの取得は1回だけ行われるはず
      expect(mockRetrieve).toHaveBeenCalledTimes(2);
      expect(mockQueryDB).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllTags', () => {
    it('すべてのタグを取得できること', async () => {
      mockQueryDB.mockResolvedValue(mockMultiPageResponse);

      const tags = await getAllTags();

      // mockMultiPageResponseには「テスト」「サンプル」「例」の3つのタグがある
      expect(tags).toHaveLength(3);
      expect(tags).toContain('テスト');
      expect(tags).toContain('サンプル');
      expect(tags).toContain('例');
      expect(tags).toEqual(expect.arrayContaining(['テスト', 'サンプル', '例']));
    });

    it('エラーが発生した場合に適切なエラーメッセージを返すこと', async () => {
      mockQueryDB.mockRejectedValue(new Error('Database error'));

      await expect(getAllTags()).rejects.toThrow('すべてのタグの取得に失敗しました');
    });
  });

  describe('getAllCategories', () => {
    it('すべてのカテゴリを取得できること', async () => {
      // カテゴリ付きのページを含むモックレスポンスを作成
      const mockWithCategories = {
        ...mockMultiPageResponse,
        results: [
          {
            ...mockPageResponse,
            properties: {
              ...mockPageResponse.properties,
              category: {
                id: 'category-id',
                type: 'select',
                select: { id: 'cat-1', name: 'プログラミング', color: 'blue' },
              },
            },
          },
          {
            ...mockPageResponse,
            id: 'page-2',
            properties: {
              ...mockPageResponse.properties,
              category: {
                id: 'category-id',
                type: 'select',
                select: { id: 'cat-2', name: 'デザイン', color: 'green' },
              },
            },
          },
        ],
      };

      mockQueryDB.mockResolvedValue(mockWithCategories);

      const categories = await getAllCategories();

      expect(categories).toHaveLength(2);
      expect(categories).toContain('プログラミング');
      expect(categories).toContain('デザイン');
    });

    it('カテゴリがないページがある場合でも処理できること', async () => {
      // 一部のページにはカテゴリが設定されていない
      const mockMixedCategories = {
        ...mockMultiPageResponse,
        results: [
          {
            ...mockPageResponse,
            properties: {
              ...mockPageResponse.properties,
              category: {
                id: 'category-id',
                type: 'select',
                select: { id: 'cat-1', name: 'プログラミング', color: 'blue' },
              },
            },
          },
          {
            ...mockPageResponse,
            id: 'page-2',
            properties: {
              ...mockPageResponse.properties,
              // カテゴリなし
            },
          },
        ],
      };

      mockQueryDB.mockResolvedValue(mockMixedCategories);

      const categories = await getAllCategories();

      expect(categories).toHaveLength(1);
      expect(categories).toContain('プログラミング');
    });
  });

  describe('searchPages', () => {
    it('検索キーワードでページを検索できること', async () => {
      mockQueryDB.mockResolvedValue(mockMultiPageResponse);

      const results = await searchPages('テスト');

      expect(results).toHaveLength(2);
    });

    it('タイトルで検索できること', async () => {
      mockQueryDB.mockResolvedValue(mockMultiPageResponse);

      const results = await searchPages('別の');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('別のテストページ');
    });

    it('空の検索クエリの場合は空の配列を返すこと', async () => {
      const results = await searchPages('');

      expect(results).toHaveLength(0);
      expect(mockQueryDB).not.toHaveBeenCalled();
    });
  });
});
