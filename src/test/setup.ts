import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 環境変数のモック
vi.stubGlobal('process', {
  ...process,
  env: {
    ...process.env,
    NODE_ENV: 'test',
    NOTION_API_KEY: 'test-api-key',
    NOTION_DATABASE_ID: 'test-database-id',
  },
});

// モックの基本設定
vi.mock('@notionhq/client', () => {
  const mockRetrieve = vi.fn();
  const mockRetrieveDatabase = vi.fn();
  const mockListBlocks = vi.fn();
  const mockQueryDataSource = vi.fn();
  const mockRequest = vi.fn();

  const testGlobal = globalThis as typeof globalThis & {
    mockRetrieve: typeof mockRetrieve;
    mockRetrieveDatabase: typeof mockRetrieveDatabase;
    mockListBlocks: typeof mockListBlocks;
    mockQueryDataSource: typeof mockQueryDataSource;
    mockRequest: typeof mockRequest;
  };

  // グローバルに公開して他のテストファイルからアクセスできるようにする
  testGlobal.mockRetrieve = mockRetrieve;
  testGlobal.mockRetrieveDatabase = mockRetrieveDatabase;
  testGlobal.mockListBlocks = mockListBlocks;
  testGlobal.mockQueryDataSource = mockQueryDataSource;
  testGlobal.mockRequest = mockRequest;

  return {
    APIErrorCode: {
      ObjectNotFound: 'object_not_found',
    },
    isNotionClientError: (error: unknown) => {
      if (typeof error !== 'object' || error === null) {
        return false;
      }

      return 'code' in error;
    },
    Client: vi.fn(function Client() {
      return {
        pages: {
          retrieve: mockRetrieve,
        },
        blocks: {
          children: {
            list: mockListBlocks,
          },
        },
        dataSources: {
          query: mockQueryDataSource,
        },
        databases: {
          retrieve: mockRetrieveDatabase,
        },
        request: mockRequest,
      };
    }),
  };
});

// React関連のモック
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    // 必要に応じて追加のReactメソッドをモック
  };
});

// console関数のモック化（テスト出力を整理するため）
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'debug').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
});
