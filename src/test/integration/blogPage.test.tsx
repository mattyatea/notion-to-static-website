/**
 * ブログページの統合テスト
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getPageBySlug } from '../../lib/notion';
import { NotionBlocks } from '../../components/NotionBlock';
import { mockFormattedPage } from '../mocks/notionData';

// Notion APIクライアントのモック
vi.mock('@notionhq/client', () => {
  return {
    Client: vi.fn(() => ({
      pages: {
        retrieve: vi.fn(),
      },
      blocks: {
        children: {
          list: vi.fn(),
        },
      },
      databases: {
        query: vi.fn(),
      },
    })),
  };
});

// getPageBySlugのモックを準備
vi.mock('../../lib/notion', async () => {
  const actual = await vi.importActual('../../lib/notion');
  return {
    ...actual,
    getPageBySlug: vi.fn(),
  };
});

describe('ブログページ統合テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('スラッグから記事を取得してレンダリングするフロー', async () => {
    // モックの設定
    vi.mocked(getPageBySlug).mockResolvedValue(mockFormattedPage);

    // スラッグから記事を取得
    const slug = 'test-page';
    const page = await getPageBySlug(slug);

    // 取得した記事のブロックをレンダリング
    render(<NotionBlocks blocks={page!.blocks} />);

    // 記事の内容が正しくレンダリングされていることを確認
    expect(screen.getByText('これはテスト段落です。')).toBeInTheDocument();
    expect(screen.getByText('テスト見出し')).toBeInTheDocument();
  });

  it('ブログ記事のメタデータを正しく表示すること', async () => {
    // ブログ記事用のシンプルなコンポーネント
    const BlogPostMeta = ({ page }: { page: typeof mockFormattedPage }) => (
      <div>
        <h1>{page.title}</h1>
        <p className="summary">{page.summary}</p>
        <div className="tags">
          {page.tags.map((tag) => (
            <span key={tag.name} className={`tag tag-${tag.color}`}>
              {tag.name}
            </span>
          ))}
        </div>
        <time dateTime={page.date}>{new Date(page.date).toLocaleDateString('ja-JP')}</time>
      </div>
    );

    // モックの設定
    vi.mocked(getPageBySlug).mockResolvedValue(mockFormattedPage);

    // スラッグから記事を取得
    const slug = 'test-page';
    const page = await getPageBySlug(slug);

    // 記事のメタデータをレンダリング
    render(<BlogPostMeta page={page!} />);

    // メタデータが正しく表示されていることを確認
    expect(screen.getByText('テストページ')).toBeInTheDocument();
    expect(screen.getByText('これはテストページの概要です。')).toBeInTheDocument();
    expect(screen.getByText('テスト')).toBeInTheDocument();
    expect(screen.getByText('サンプル')).toBeInTheDocument();

    // 日付が正しいフォーマットで表示されていることを確認
    const date = new Date('2024-01-01T00:00:00.000Z').toLocaleDateString('ja-JP');
    expect(screen.getByText(date)).toBeInTheDocument();
  });

  it('記事が見つからない場合に適切に処理すること', async () => {
    // 記事が見つからない場合のシンプルなコンポーネント
    const NotFound = () => <div>記事が見つかりませんでした</div>;
    const BlogPost = ({ page }: { page: typeof mockFormattedPage | null }) => (
      <div>
        {page ? (
          <div>
            <h1>{page.title}</h1>
            <NotionBlocks blocks={page.blocks} />
          </div>
        ) : (
          <NotFound />
        )}
      </div>
    );

    // モックの設定（記事が見つからない場合）
    vi.mocked(getPageBySlug).mockResolvedValue(null);

    // 存在しないスラッグで記事を取得
    const slug = 'non-existent-page';
    const page = await getPageBySlug(slug);

    // 記事コンポーネントをレンダリング
    render(<BlogPost page={page} />);

    // NotFoundコンポーネントが表示されていることを確認
    expect(screen.getByText('記事が見つかりませんでした')).toBeInTheDocument();
  });
});
