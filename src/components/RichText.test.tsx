import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RichText } from './NotionBlock';
import type { RichTextItem } from '../types/notion';

describe('RichText', () => {
  it('リッチテキストが空の場合はnullを返すこと', () => {
    const { container } = render(<RichText richText={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('リッチテキストがundefinedの場合はnullを返すこと', () => {
    const { container } = render(<RichText richText={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('通常のテキストを正しくレンダリングすること', () => {
    const richText: RichTextItem[] = [
      {
        type: 'text',
        plain_text: 'テストテキスト',
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
        href: null,
        text: {
          content: 'テストテキスト',
          link: null,
        },
      },
    ];

    render(<RichText richText={richText} />);
    expect(screen.getByText('テストテキスト')).toBeInTheDocument();
  });

  it('太字のテキストを正しくレンダリングすること', () => {
    const richText: RichTextItem[] = [
      {
        type: 'text',
        plain_text: '太字テキスト',
        annotations: {
          bold: true,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
        href: null,
        text: {
          content: '太字テキスト',
          link: null,
        },
      },
    ];

    render(<RichText richText={richText} />);
    expect(screen.getByText('太字テキスト')).toBeInTheDocument();
  });

  it('イタリックのテキストを正しくレンダリングすること', () => {
    const richText: RichTextItem[] = [
      {
        type: 'text',
        plain_text: 'イタリックテキスト',
        annotations: {
          bold: false,
          italic: true,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
        href: null,
        text: {
          content: 'イタリックテキスト',
          link: null,
        },
      },
    ];

    render(<RichText richText={richText} />);
    expect(screen.getByText('イタリックテキスト')).toBeInTheDocument();
  });

  it('取り消し線のテキストを正しくレンダリングすること', () => {
    const richText: RichTextItem[] = [
      {
        type: 'text',
        plain_text: '取り消し線テキスト',
        annotations: {
          bold: false,
          italic: false,
          strikethrough: true,
          underline: false,
          code: false,
          color: 'default',
        },
        href: null,
        text: {
          content: '取り消し線テキスト',
          link: null,
        },
      },
    ];

    render(<RichText richText={richText} />);
    expect(screen.getByText('取り消し線テキスト')).toBeInTheDocument();
  });

  it('下線付きテキストを正しくレンダリングすること', () => {
    const richText: RichTextItem[] = [
      {
        type: 'text',
        plain_text: '下線付きテキスト',
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: true,
          code: false,
          color: 'default',
        },
        href: null,
        text: {
          content: '下線付きテキスト',
          link: null,
        },
      },
    ];

    render(<RichText richText={richText} />);
    expect(screen.getByText('下線付きテキスト')).toBeInTheDocument();
  });

  it('コードテキストを正しくレンダリングすること', () => {
    const richText: RichTextItem[] = [
      {
        type: 'text',
        plain_text: 'コードテキスト',
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: true,
          color: 'default',
        },
        href: null,
        text: {
          content: 'コードテキスト',
          link: null,
        },
      },
    ];

    render(<RichText richText={richText} />);
    expect(screen.getByText('コードテキスト')).toBeInTheDocument();
  });

  it('リンクテキストを正しくレンダリングすること', () => {
    const richText: RichTextItem[] = [
      {
        type: 'text',
        plain_text: 'リンクテキスト',
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
        href: 'https://example.com',
        text: {
          content: 'リンクテキスト',
          link: { url: 'https://example.com' },
        },
      },
    ];

    render(<RichText richText={richText} />);
    expect(screen.getByText('リンクテキスト')).toBeInTheDocument();
  });

  it('カラーテキストを正しくレンダリングすること', () => {
    const richText: RichTextItem[] = [
      {
        type: 'text',
        plain_text: 'カラーテキスト',
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'red',
        },
        href: null,
        text: {
          content: 'カラーテキスト',
          link: null,
        },
      },
    ];

    render(<RichText richText={richText} />);
    expect(screen.getByText('カラーテキスト')).toBeInTheDocument();
  });

  it('背景色付きテキストを正しくレンダリングすること', () => {
    const richText: RichTextItem[] = [
      {
        type: 'text',
        plain_text: '背景色テキスト',
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'blue_background',
        },
        href: null,
        text: {
          content: '背景色テキスト',
          link: null,
        },
      },
    ];

    render(<RichText richText={richText} />);
    expect(screen.getByText('背景色テキスト')).toBeInTheDocument();
  });

  it('複数のスタイルが適用されたテキストを正しくレンダリングすること', () => {
    const richText: RichTextItem[] = [
      {
        type: 'text',
        plain_text: '複合スタイル',
        annotations: {
          bold: true,
          italic: true,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
        href: null,
        text: {
          content: '複合スタイル',
          link: null,
        },
      },
    ];

    render(<RichText richText={richText} />);
    expect(screen.getByText('複合スタイル')).toBeInTheDocument();
  });

  it('複数のリッチテキストアイテムを正しくレンダリングすること', () => {
    const richText: RichTextItem[] = [
      {
        type: 'text',
        plain_text: '最初のテキスト',
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
        href: null,
        text: {
          content: '最初のテキスト',
          link: null,
        },
      },
      {
        type: 'text',
        plain_text: '二番目のテキスト',
        annotations: {
          bold: true,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
        href: null,
        text: {
          content: '二番目のテキスト',
          link: null,
        },
      },
    ];

    render(<RichText richText={richText} />);
    expect(screen.getByText(/最初のテキスト/)).toBeInTheDocument();
    expect(screen.getByText(/二番目のテキスト/)).toBeInTheDocument();
  });
});
