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
  const mockListBlocks = vi.fn();
  const mockQueryDB = vi.fn();

  // グローバルに公開して他のテストファイルからアクセスできるようにする
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  (global as unknown).mockRetrieve = mockRetrieve;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  (global as unknown).mockListBlocks = mockListBlocks;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  (global as unknown).mockQueryDB = mockQueryDB;

  return {
    Client: vi.fn(() => ({
      pages: {
        retrieve: mockRetrieve,
      },
      blocks: {
        children: {
          list: mockListBlocks,
        },
      },
      databases: {
        query: mockQueryDB,
      },
    })),
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
  vi.spyOn(console, 'log').mockImplementation(() => {
  });
  vi.spyOn(console, 'debug').mockImplementation(() => {
  });
  vi.spyOn(console, 'info').mockImplementation(() => {
  });
  vi.spyOn(console, 'warn').mockImplementation(() => {
  });
  vi.spyOn(console, 'error').mockImplementation(() => {
  });
});

afterEach(() => {
  vi.clearAllMocks();
});
