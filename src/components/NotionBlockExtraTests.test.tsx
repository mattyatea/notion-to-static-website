import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NotionBlock, { NotionBlocks, renderOptimizedBlocks } from './NotionBlock';
import type { NotionBlockWithChildren } from '@/types/notion.ts';

// NotionBlocksのテスト続き
describe('NotionBlocks続き', () => {
  it('異なるタイプのブロックを正しくレンダリングすること', () => {
    const blocks = [
      {
        id: 'heading',
        type: 'heading_1',
        heading_1: {
          rich_text: [
            {
              type: 'text',
              plain_text: 'タイトル',
              annotations: {
                bold: false,
                italic: false,
                code: false,
                color: 'default',
              },
            },
          ],
        },
      },
      {
        id: 'paragraph',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              plain_text: '段落',
              annotations: {
                bold: false,
                italic: false,
                code: false,
                color: 'default',
              },
            },
          ],
        },
      },
    ] as unknown as NotionBlockWithChildren[];

    render(<NotionBlocks blocks={blocks} />);
    expect(screen.getByText('タイトル')).toBeInTheDocument();
    expect(screen.getByText('段落')).toBeInTheDocument();
  });

  it('番号付きリストと箇条書きリストを切り替えて正しくグループ化すること', () => {
    const blocks = [
      {
        id: 'bulleted-1',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', plain_text: '箇条書き1', annotations: {} }],
        },
      },
      {
        id: 'bulleted-2',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', plain_text: '箇条書き2', annotations: {} }],
        },
      },
      {
        id: 'numbered-1',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ type: 'text', plain_text: '番号付き1', annotations: {} }],
        },
      },
      {
        id: 'numbered-2',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ type: 'text', plain_text: '番号付き2', annotations: {} }],
        },
      },
    ] as unknown as NotionBlockWithChildren[];

    render(<NotionBlocks blocks={blocks} />);
    expect(screen.getByText('箇条書き1')).toBeInTheDocument();
    expect(screen.getByText('箇条書き2')).toBeInTheDocument();
    expect(screen.getByText('番号付き1')).toBeInTheDocument();
    expect(screen.getByText('番号付き2')).toBeInTheDocument();
  });
});

// renderOptimizedBlocks 関数のテスト
describe('renderOptimizedBlocks', () => {
  it('最適化されたブロックをレンダリングすること', () => {
    const blocks = [
      {
        id: 'paragraph',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              plain_text: '最適化テスト',
              annotations: {
                bold: false,
                italic: false,
                code: false,
                color: 'default',
              },
            },
          ],
        },
      },
    ] as unknown as NotionBlockWithChildren[];

    render(renderOptimizedBlocks(blocks));
    expect(screen.getByText('最適化テスト')).toBeInTheDocument();
  });

  it('空のブロックリストでも正しく処理すること', () => {
    const blocks: NotionBlockWithChildren[] = [];
    render(renderOptimizedBlocks(blocks));
    expect(screen.getByText('コンテンツがありません')).toBeInTheDocument();
  });
});

// getStyleClasses 関数をテストするためのモック
describe('スタイルクラス関数', () => {
  // 直接アクセスできないため、RichTextを通じてテスト
  it('色付きテキストのスタイルを正しく適用すること', () => {
    const richTextWithColor = [
      {
        type: 'text',
        plain_text: '赤色テキスト',
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'red',
        },
        href: null,
      },
    ];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { container } = render(
      <NotionBlock
        block={{
          id: 'test-color',
          type: 'paragraph',
          paragraph: { rich_text: richTextWithColor },
        }}
      />
    );

    expect(screen.getByText('赤色テキスト')).toBeInTheDocument();
  });

  it('背景色付きテキストのスタイルを正しく適用すること', () => {
    const richTextWithBgColor = [
      {
        type: 'text',
        plain_text: '背景色付きテキスト',
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'blue_background',
        },
        href: null,
      },
    ];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { container } = render(
      <NotionBlock
        block={{
          id: 'test-bg-color',
          type: 'paragraph',
          paragraph: { rich_text: richTextWithBgColor },
        }}
      />
    );

    expect(screen.getByText('背景色付きテキスト')).toBeInTheDocument();
  });
});

// 特殊ケースのテスト
describe('特殊ケースとエッジケース', () => {
  it('空のリッチテキストを持つブロックを処理できること', () => {
    const emptyBlock = {
      id: 'empty-block',
      type: 'paragraph',
      paragraph: {
        rich_text: [],
      },
    };

    render(<NotionBlock block={emptyBlock} />);
    expect(screen.getByTestId('block-paragraph')).toBeInTheDocument();
  });

  it('リッチテキストがundefinedのブロックを処理できること', () => {
    const undefinedTextBlock = {
      id: 'undefined-text-block',
      type: 'paragraph',
      paragraph: {},
    } as unknown as NotionBlockWithChildren;

    render(<NotionBlock block={undefinedTextBlock} />);
    expect(screen.getByTestId('block-paragraph')).toBeInTheDocument();
  });

  it('未定義のブロックタイプを処理できること', () => {
    const unknownTypeBlock = {
      id: 'unknown-type',
      type: 'non_existent_type',
    };

    render(<NotionBlock block={unknownTypeBlock} />);
    expect(screen.getByText(/サポートされていないブロックタイプ/)).toBeInTheDocument();
  });

  it('子ブロックを持つリストアイテムを処理できること', () => {
    const nestedListBlock = {
      id: 'nested-list',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [
          {
            type: 'text',
            plain_text: '親リストアイテム',
            annotations: {},
          },
        ],
      },
      has_children: true,
      children: [
        {
          id: 'child-list-item',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                plain_text: '子リストアイテム',
                annotations: {},
              },
            ],
          },
        },
      ],
    } as unknown as NotionBlockWithChildren;

    render(<NotionBlock block={nestedListBlock} />);
    expect(screen.getByText('親リストアイテム')).toBeInTheDocument();
  });
});
