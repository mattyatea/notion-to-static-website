import { beforeEach, describe, expect, it, type Mock } from 'vitest';
import {
  clearCache,
  clearDataSourceIdCache,
  formatPage,
  formatPages,
  getFormattedDatabase,
} from './index';
import {
  mockBlocks,
  mockDatabaseQueryResponse,
  mockMultiPageResponse,
  mockPageResponse,
} from '@/test/mocks/notionData';

type GlobalNotionMocks = {
  mockQueryDataSource: Mock;
  mockRetrieveDatabase: Mock;
};

const { mockQueryDataSource, mockRetrieveDatabase } = globalThis as unknown as GlobalNotionMocks;

describe('Notion database module', () => {
  beforeEach(() => {
    mockQueryDataSource.mockReset();
    mockRetrieveDatabase.mockReset();
    clearCache();
    clearDataSourceIdCache();
  });

  describe('formatPage', () => {
    it('formats a page response', () => {
      const formattedPage = formatPage(mockPageResponse);

      expect(formattedPage.id).toBe(mockPageResponse.id);
      expect(formattedPage.title).toBe('テストページ');
      expect(formattedPage.slug).toBe('test-page');
      expect(formattedPage.tags).toHaveLength(2);
      expect(formattedPage.tags[0].name).toBe('テスト');
    });

    it('handles missing title', () => {
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

    it('includes blocks when provided', () => {
      const formattedPage = formatPage(mockPageResponse, mockBlocks);

      expect(formattedPage.blocks).toHaveLength(mockBlocks.length);
      expect(formattedPage.blocks[0].type).toBe('paragraph');
    });

    it('maps cover data as thumbnail', () => {
      const formattedPage = formatPage(mockPageResponse);

      expect(formattedPage.thumbnail?.type).toBe('external');
      expect(formattedPage.thumbnail?.url).toBe('https://example.com/cover.jpg');
    });
  });

  describe('formatPages', () => {
    it('formats multiple pages', () => {
      const pages = [mockPageResponse, { ...mockPageResponse, id: 'page-2' }];
      const formattedPages = formatPages(pages);

      expect(formattedPages).toHaveLength(2);
      expect(formattedPages[0].id).toBe('page-id-123');
      expect(formattedPages[1].id).toBe('page-2');
    });

    it('returns empty array for empty input', () => {
      expect(formatPages([])).toEqual([]);
    });
  });

  describe('getFormattedDatabase', () => {
    it('returns formatted pages from database', async () => {
      mockQueryDataSource.mockResolvedValue(mockMultiPageResponse);

      const pages = await getFormattedDatabase();

      expect(pages).toHaveLength(2);
      expect(pages[0].title).toBe('テストページ');
      expect(pages[1].title).toBe('別のテストページ');
      expect(mockQueryDataSource).toHaveBeenCalledWith({
        data_source_id: 'test-database-id',
        sorts: [{ property: 'date', direction: 'descending' }],
        filter: { property: 'status', select: { equals: 'Public' } },
      });
    });

    it('omits status filter when filterByStatus is false', async () => {
      mockQueryDataSource.mockResolvedValue(mockMultiPageResponse);

      await getFormattedDatabase(false);

      expect(mockQueryDataSource).toHaveBeenCalledWith({
        data_source_id: 'test-database-id',
        sorts: [{ property: 'date', direction: 'descending' }],
      });
    });

    it('handles pagination', async () => {
      mockQueryDataSource
        .mockResolvedValueOnce({
          ...mockDatabaseQueryResponse,
          results: [mockPageResponse],
          has_more: true,
          next_cursor: 'cursor-1',
        })
        .mockResolvedValueOnce({
          ...mockDatabaseQueryResponse,
          results: [{ ...mockPageResponse, id: 'page-id-456' }],
          has_more: false,
          next_cursor: null,
        });

      const pages = await getFormattedDatabase();

      expect(pages).toHaveLength(2);
      expect(mockQueryDataSource).toHaveBeenCalledTimes(2);
      expect(mockQueryDataSource).toHaveBeenNthCalledWith(1, {
        data_source_id: 'test-database-id',
        sorts: [{ property: 'date', direction: 'descending' }],
        filter: { property: 'status', select: { equals: 'Public' } },
      });
      expect(mockQueryDataSource).toHaveBeenNthCalledWith(2, {
        data_source_id: 'test-database-id',
        sorts: [{ property: 'date', direction: 'descending' }],
        filter: { property: 'status', select: { equals: 'Public' } },
        start_cursor: 'cursor-1',
      });
    });

    it('throws a detailed error on request failure', async () => {
      mockQueryDataSource.mockRejectedValue(new Error('404 Not Found'));

      await expect(getFormattedDatabase()).rejects.toThrow('データベースが見つかりません');
    });

    it('resolves and uses data source id before querying', async () => {
      mockQueryDataSource.mockResolvedValueOnce(mockMultiPageResponse);
      mockRetrieveDatabase.mockResolvedValue({
        data_sources: [{ id: 'resolved-data-source-id', name: 'Main' }],
      });

      const pages = await getFormattedDatabase();

      expect(pages).toHaveLength(2);
      expect(mockRetrieveDatabase).toHaveBeenCalledWith({
        database_id: 'test-database-id',
      });
      expect(mockQueryDataSource).toHaveBeenCalledTimes(1);
      expect(mockQueryDataSource).toHaveBeenNthCalledWith(1, {
        data_source_id: 'resolved-data-source-id',
        sorts: [{ property: 'date', direction: 'descending' }],
        filter: { property: 'status', select: { equals: 'Public' } },
      });
    });
  });
});
