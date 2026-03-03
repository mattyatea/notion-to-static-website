import { beforeEach, describe, expect, it, type Mock } from 'vitest';
import {
  clearCache,
  clearDataSourceIdCache,
  getAllCategories,
  getAllTags,
  getPagesByCategory,
  getPagesByTag,
  searchPages,
} from './index';
import { mockMultiPageResponse, mockPageResponse } from '@/test/mocks/notionData';

type GlobalNotionMocks = {
  mockQueryDataSource: Mock;
};

const { mockQueryDataSource } = globalThis as unknown as GlobalNotionMocks;

describe('Notion tags and categories module', () => {
  beforeEach(() => {
    mockQueryDataSource.mockReset();
    clearCache();
    clearDataSourceIdCache();
  });

  describe('getPagesByTag', () => {
    it('filters pages by tag', async () => {
      mockQueryDataSource.mockResolvedValue(mockMultiPageResponse);

      const pages = await getPagesByTag('テスト');

      expect(pages).toHaveLength(2);
      expect(mockQueryDataSource).toHaveBeenCalledWith({
        data_source_id: 'test-database-id',
        filter: {
          property: 'tags',
          multi_select: { contains: 'テスト' },
        },
        sorts: [{ property: 'date', direction: 'descending' }],
      });
    });

    it('throws a detailed error on request failure', async () => {
      mockQueryDataSource.mockRejectedValue(new Error('Database error'));

      await expect(getPagesByTag('テスト')).rejects.toThrow('タグでのフィルタリングに失敗しました');
    });
  });

  describe('getPagesByCategory', () => {
    it('filters pages by category', async () => {
      mockQueryDataSource.mockResolvedValue(mockMultiPageResponse);

      const pages = await getPagesByCategory('プログラミング');

      expect(pages).toHaveLength(2);
      expect(mockQueryDataSource).toHaveBeenCalledWith({
        data_source_id: 'test-database-id',
        filter: {
          property: 'category',
          select: { equals: 'プログラミング' },
        },
        sorts: [{ property: 'date', direction: 'descending' }],
      });
    });
  });

  describe('getAllTags', () => {
    it('returns all unique tags', async () => {
      mockQueryDataSource.mockResolvedValue(mockMultiPageResponse);

      const tags = await getAllTags();

      expect(tags).toHaveLength(3);
      expect(tags).toEqual(expect.arrayContaining(['テスト', 'サンプル', '例']));
    });

    it('throws a wrapped error when database lookup fails', async () => {
      mockQueryDataSource.mockRejectedValue(new Error('Database error'));

      await expect(getAllTags()).rejects.toThrow('すべてのタグの取得に失敗しました');
    });
  });

  describe('getAllCategories', () => {
    it('returns all unique categories', async () => {
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

      mockQueryDataSource.mockResolvedValue(mockWithCategories);

      const categories = await getAllCategories();

      expect(categories).toHaveLength(2);
      expect(categories).toContain('プログラミング');
      expect(categories).toContain('デザイン');
    });

    it('ignores pages without category', async () => {
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
          },
        ],
      };

      mockQueryDataSource.mockResolvedValue(mockMixedCategories);

      const categories = await getAllCategories();

      expect(categories).toHaveLength(1);
      expect(categories).toContain('プログラミング');
    });
  });

  describe('searchPages', () => {
    it('searches by keyword', async () => {
      mockQueryDataSource.mockResolvedValue(mockMultiPageResponse);

      const results = await searchPages('テスト');

      expect(results).toHaveLength(2);
    });

    it('searches by title', async () => {
      mockQueryDataSource.mockResolvedValue(mockMultiPageResponse);

      const results = await searchPages('別の');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('別のテストページ');
    });

    it('returns empty array for empty query', async () => {
      const results = await searchPages('');

      expect(results).toHaveLength(0);
      expect(mockQueryDataSource).not.toHaveBeenCalled();
    });
  });
});
