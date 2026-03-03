import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  clearCache,
  clearDataSourceIdCache,
  getBlocks,
  getFormattedPage,
  getPage,
  getPageBySlug,
} from './index';
import { mockBlocks, mockPageResponse } from '@/test/mocks/notionData';

type GlobalNotionMocks = {
  mockRetrieve: Mock;
  mockListBlocks: Mock;
  mockQueryDataSource: Mock;
};

const { mockRetrieve, mockListBlocks, mockQueryDataSource } =
  globalThis as unknown as GlobalNotionMocks;

describe('Notion page module', () => {
  beforeEach(() => {
    mockRetrieve.mockReset();
    mockListBlocks.mockReset();
    mockQueryDataSource.mockReset();
    clearCache();
    clearDataSourceIdCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getPage', () => {
    it('gets page by id', async () => {
      mockRetrieve.mockResolvedValue(mockPageResponse);

      const page = await getPage('page-id-123');

      expect(page).toEqual(mockPageResponse);
      expect(mockRetrieve).toHaveBeenCalledWith({ page_id: 'page-id-123' });
    });

    it('maps 404 errors', async () => {
      mockRetrieve.mockRejectedValue(new Error('404 Not Found'));

      await expect(getPage('not-exist')).rejects.toThrow('ページが見つかりません');
    });

    it('maps auth errors', async () => {
      mockRetrieve.mockRejectedValue(new Error('401 Unauthorized'));

      await expect(getPage('unauthorized')).rejects.toThrow('ページへのアクセス権限がありません');
    });

    it('uses cache for repeated page lookups', async () => {
      mockRetrieve.mockResolvedValue(mockPageResponse);

      await getPage('cache-test');
      await getPage('cache-test');

      expect(mockRetrieve).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBlocks', () => {
    it('gets blocks for a block id', async () => {
      mockListBlocks.mockResolvedValue({ results: mockBlocks, has_more: false });

      const blocks = await getBlocks('block-id-123');

      expect(blocks).toEqual(mockBlocks);
      expect(mockListBlocks).toHaveBeenCalledWith({
        block_id: 'block-id-123',
        page_size: 100,
      });
    });

    it('recursively fetches child blocks', async () => {
      mockListBlocks
        .mockResolvedValueOnce({
          results: [
            {
              id: 'parent-block',
              type: 'toggle',
              has_children: true,
              toggle: { rich_text: [{ plain_text: '親ブロック', type: 'text' }] },
            },
          ],
          has_more: false,
        })
        .mockResolvedValueOnce({
          results: [
            {
              id: 'child-block',
              type: 'paragraph',
              has_children: false,
              paragraph: { rich_text: [{ plain_text: '子ブロック', type: 'text' }] },
            },
          ],
          has_more: false,
        });

      const blocks = await getBlocks('parent-block-id');

      expect(blocks).toHaveLength(1);
      expect(blocks[0].id).toBe('parent-block');
      expect(mockListBlocks).toHaveBeenCalledTimes(2);
    });

    it('supports pagination', async () => {
      mockListBlocks
        .mockResolvedValueOnce({
          results: [mockBlocks[0], mockBlocks[1]],
          has_more: true,
          next_cursor: 'next-page',
        })
        .mockResolvedValueOnce({
          results: [mockBlocks[2], mockBlocks[3]],
          has_more: false,
        });

      const blocks = await getBlocks('paginated-blocks');

      expect(blocks).toHaveLength(4);
      expect(mockListBlocks).toHaveBeenCalledTimes(2);
      expect(mockListBlocks).toHaveBeenNthCalledWith(2, {
        block_id: 'paginated-blocks',
        start_cursor: 'next-page',
        page_size: 100,
      });
    });
  });

  describe('getFormattedPage', () => {
    it('formats a page with blocks', async () => {
      mockRetrieve.mockResolvedValue(mockPageResponse);
      mockListBlocks.mockResolvedValue({ results: mockBlocks, has_more: false });

      const page = await getFormattedPage('page-id-123');

      expect(page.id).toBe('page-id-123');
      expect(page.blocks).toHaveLength(mockBlocks.length);
      expect(mockRetrieve).toHaveBeenCalledTimes(1);
      expect(mockListBlocks).toHaveBeenCalledTimes(1);
    });

    it('skips blocks when fetchBlocks is false', async () => {
      mockRetrieve.mockResolvedValue(mockPageResponse);

      const page = await getFormattedPage('page-id-123', false);

      expect(page.blocks).toHaveLength(0);
      expect(mockListBlocks).not.toHaveBeenCalled();
    });

    it('throws a formatted-page error when dependent calls fail', async () => {
      mockRetrieve.mockRejectedValue(new Error('Error getting page'));

      await expect(getFormattedPage('error-page')).rejects.toThrow('ページの整形に失敗しました');
    });
  });

  describe('getPageBySlug', () => {
    it('gets page by slug', async () => {
      mockQueryDataSource.mockResolvedValue({
        results: [mockPageResponse],
        has_more: false,
        object: 'list',
        next_cursor: null,
      });
      mockRetrieve.mockResolvedValue(mockPageResponse);
      mockListBlocks.mockResolvedValue({ results: mockBlocks, has_more: false });

      const page = await getPageBySlug('test-page');

      expect(page).not.toBeNull();
      expect(page?.slug).toBe('test-page');
      expect(mockQueryDataSource).toHaveBeenCalledWith({
        data_source_id: 'test-database-id',
        filter: {
          property: 'slug',
          rich_text: { equals: 'test-page' },
        },
      });
    });

    it('returns null when slug is not found', async () => {
      mockQueryDataSource.mockResolvedValue({
        results: [],
        has_more: false,
        object: 'list',
        next_cursor: null,
      });

      const page = await getPageBySlug('missing');

      expect(page).toBeNull();
    });

    it('wraps request errors', async () => {
      mockQueryDataSource.mockRejectedValue(new Error('database query failed'));

      await expect(getPageBySlug('test-page')).rejects.toThrow(
        'スラッグからページの取得に失敗しました'
      );
    });
  });
});
