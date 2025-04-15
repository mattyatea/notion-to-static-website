/**
 * テスト用のNotionデータモック
 */
import type {
  DatabaseQueryResponse,
  FormattedPage,
  NotionBlockWithChildren,
  PageResponse,
} from '@/types/notion.ts';

/**
 * Notion APIからのページレスポンスのモック
 */
export const mockPageResponse: PageResponse = {
  id: 'page-id-123',
  properties: {
    title: {
      id: 'title-id',
      type: 'title',
      title: [
        {
          type: 'text',
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
          plain_text: 'テストページ',
          href: null,
          text: {
            content: 'テストページ',
            link: null,
          },
        },
      ],
    },
    slug: {
      id: 'slug-id',
      type: 'rich_text',
      rich_text: [
        {
          type: 'text',
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
          plain_text: 'test-page',
          href: null,
          text: {
            content: 'test-page',
            link: null,
          },
        },
      ],
    },
    date: {
      id: 'date-id',
      type: 'date',
      date: {
        start: '2024-01-01',
        end: null,
        time_zone: null,
      },
    },
    tags: {
      id: 'tags-id',
      type: 'multi_select',
      multi_select: [
        {
          id: 'tag-1',
          name: 'テスト',
          color: 'blue',
        },
        {
          id: 'tag-2',
          name: 'サンプル',
          color: 'green',
        },
      ],
    },
    status: {
      id: 'status-id',
      type: 'select',
      select: {
        id: 'status-1',
        name: 'Public',
        color: 'green',
      },
    },
    summary: {
      id: 'summary-id',
      type: 'rich_text',
      rich_text: [
        {
          type: 'text',
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
          plain_text: 'これはテストページの概要です。',
          href: null,
          text: {
            content: 'これはテストページの概要です。',
            link: null,
          },
        },
      ],
    },
  },
  created_time: '2024-01-01T00:00:00.000Z',
  last_edited_time: '2024-01-02T00:00:00.000Z',
  cover: {
    type: 'external',
    external: {
      url: 'https://example.com/cover.jpg',
    },
  },
};

/**
 * Notionブロックのモック
 */
export const mockBlocks: NotionBlockWithChildren[] = [
  {
    id: 'block-1',
    type: 'paragraph',
    has_children: false,
    paragraph: {
      rich_text: [
        {
          type: 'text',
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
          plain_text: 'これはテスト段落です。',
          href: null,
          text: {
            content: 'これはテスト段落です。',
            link: null,
          },
        },
      ],
    },
  },
  {
    id: 'block-2',
    type: 'heading_1',
    has_children: false,
    heading_1: {
      rich_text: [
        {
          type: 'text',
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
          plain_text: 'テスト見出し',
          href: null,
          text: {
            content: 'テスト見出し',
            link: null,
          },
        },
      ],
    },
  },
  {
    id: 'block-3',
    type: 'bulleted_list_item',
    has_children: false,
    bulleted_list_item: {
      rich_text: [
        {
          type: 'text',
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
          plain_text: 'リストアイテム1',
          href: null,
          text: {
            content: 'リストアイテム1',
            link: null,
          },
        },
      ],
    },
  },
  {
    id: 'block-4',
    type: 'bulleted_list_item',
    has_children: false,
    bulleted_list_item: {
      rich_text: [
        {
          type: 'text',
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
          plain_text: 'リストアイテム2',
          href: null,
          text: {
            content: 'リストアイテム2',
            link: null,
          },
        },
      ],
    },
  },
  {
    id: 'block-5',
    type: 'code',
    has_children: false,
    code: {
      rich_text: [
        {
          type: 'text',
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
          plain_text: 'console.log("Hello, World!");',
          href: null,
          text: {
            content: 'console.log("Hello, World!");',
            link: null,
          },
        },
      ],
      language: 'javascript',
    },
  },
];

/**
 * ネストされた子ブロックを持つブロックモック
 */
export const mockBlocksWithChildren: NotionBlockWithChildren[] = [
  ...mockBlocks,
  {
    id: 'block-parent',
    type: 'toggle',
    has_children: true,
    toggle: {
      rich_text: [
        {
          type: 'text',
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
          plain_text: 'トグルブロック',
          href: null,
          text: {
            content: 'トグルブロック',
            link: null,
          },
        },
      ],
    },
    children: [
      {
        id: 'block-child-1',
        type: 'paragraph',
        has_children: false,
        paragraph: {
          rich_text: [
            {
              type: 'text',
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: 'default',
              },
              plain_text: 'これは子ブロックです。',
              href: null,
              text: {
                content: 'これは子ブロックです。',
                link: null,
              },
            },
          ],
        },
      },
    ],
  },
];

/**
 * データベースクエリレスポンスのモック
 */
export const mockDatabaseQueryResponse: DatabaseQueryResponse = {
  object: 'list',
  results: [mockPageResponse],
  next_cursor: null,
  has_more: false,
};

/**
 * 複数ページのデータベースクエリレスポンスのモック
 */
export const mockMultiPageResponse: DatabaseQueryResponse = {
  object: 'list',
  results: [
    mockPageResponse,
    {
      ...mockPageResponse,
      id: 'page-id-456',
      properties: {
        ...mockPageResponse.properties,
        title: {
          id: 'title-id',
          type: 'title',
          title: [
            {
              type: 'text',
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: 'default',
              },
              plain_text: '別のテストページ',
              href: null,
              text: {
                content: '別のテストページ',
                link: null,
              },
            },
          ],
        },
        slug: {
          id: 'slug-id',
          type: 'rich_text',
          rich_text: [
            {
              type: 'text',
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: 'default',
              },
              plain_text: 'another-test-page',
              href: null,
              text: {
                content: 'another-test-page',
                link: null,
              },
            },
          ],
        },
        tags: {
          id: 'tags-id',
          type: 'multi_select',
          multi_select: [
            {
              id: 'tag-1',
              name: 'テスト',
              color: 'blue',
            },
            {
              id: 'tag-3',
              name: '例',
              color: 'red',
            },
          ],
        },
      },
    },
  ],
  next_cursor: null,
  has_more: false,
};

/**
 * フォーマット済みページデータのモック
 */
export const mockFormattedPage: FormattedPage = {
  id: 'page-id-123',
  title: 'テストページ',
  summary: 'これはテストページの概要です。',
  slug: 'test-page',
  tags: [
    { name: 'テスト', color: 'blue' },
    { name: 'サンプル', color: 'green' },
  ],
  blocks: mockBlocks,
  date: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  status: 'Public',
  thumbnail: {
    type: 'external',
    url: 'https://example.com/cover.jpg',
  },
};
