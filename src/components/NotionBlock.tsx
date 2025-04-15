/**
 * Notionブロックのレンダリングコンポーネント
 * @file このファイルはNotionのさまざまなブロックタイプをReactコンポーネントとして
 * レンダリングするためのコンポーネントを提供します。
 */

import React, { memo, useMemo } from 'react';
import type {
  NotionBlockProps,
  NotionBlocksProps,
  NotionBlockWithChildren,
  RichTextItem,
} from '../types/notion';

/**
 * リッチテキストのスタイル情報を計算する関数
 * @param annotations アノテーション情報
 * @param type
 * @returns TailwindCSSクラス名
 */
function getStyleClasses(annotations: RichTextItem['annotations'], type: string): string {
  const classes: string[] = [];

  // 色の適用
  if (annotations.color && annotations.color !== 'default') {
    if (annotations.color.includes('_background')) {
      const bgColor = annotations.color.replace('_background', '');
      classes.push(`bg-${bgColor}-100 text-${bgColor}-800 px-1 rounded`);
    } else {
      classes.push(`text-${annotations.color}-500`);
    }
  }

  // codeブロックの場合のスタイル
  if (type === 'code') {
    classes.push('bg-gray-100 p-1 rounded font-mono text-sm');
  }

  return classes.join(' ');
}

/**
 * リッチテキストをレンダリングする関数
 * @param richText リッチテキストアイテムの配列
 * @returns レンダリングされたリッチテキスト
 */
export const RichText = memo(({ richText }: { richText?: RichTextItem[] }) => {
  if (!richText || richText.length === 0) {
    return null;
  }

  return (
    <>
      {richText.map((text, index) => {
        const { annotations, plain_text, href, type } = text;
        const { bold, italic, strikethrough, underline, code } = annotations;

        // スタイルクラスを取得
        const styleClass = getStyleClasses(annotations, type);

        // コンテンツ要素
        let content = <>{plain_text}</>;

        // スタイルを内側から外側へ適用
        if (code) {
          content = (
            <code key={`code-${index}`} className="font-mono text-sm bg-gray-100 p-1 rounded">
              {content}
            </code>
          );
        }
        if (bold) {
          content = <strong key={`bold-${index}`}>{content}</strong>;
        }
        if (italic) {
          content = <em key={`italic-${index}`}>{content}</em>;
        }
        if (strikethrough) {
          content = <del key={`del-${index}`}>{content}</del>;
        }
        if (underline) {
          content = <u key={`underline-${index}`}>{content}</u>;
        }

        // リンクの処理
        if (href) {
          return (
            <a
              key={index}
              href={href}
              className={`text-blue-500 hover:underline ${styleClass}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {content}
            </a>
          );
        }

        // 通常のテキスト
        return (
          <span key={index} className={styleClass || undefined}>
            {content}
          </span>
        );
      })}
    </>
  );
});

RichText.displayName = 'RichText';

/**
 * 段落ブロックをレンダリングするコンポーネント
 */
const ParagraphBlock = memo(({ block }: NotionBlockProps) => {
  return (
    <p className="mb-4" data-testid="block-paragraph">
      <RichText richText={block.paragraph?.rich_text} />
    </p>
  );
});

ParagraphBlock.displayName = 'ParagraphBlock';

/**
 * 見出し1ブロックをレンダリングするコンポーネント
 */
const Heading1Block = memo(({ block }: NotionBlockProps) => {
  return (
    <h1 className="text-3xl font-bold mt-8 mb-4">
      <RichText richText={block.heading_1?.rich_text} />
    </h1>
  );
});

Heading1Block.displayName = 'Heading1Block';

/**
 * 見出し2ブロックをレンダリングするコンポーネント
 */
const Heading2Block = memo(({ block }: NotionBlockProps) => {
  return (
    <h2 className="text-2xl font-bold mt-6 mb-3">
      <RichText richText={block.heading_2?.rich_text} />
    </h2>
  );
});

Heading2Block.displayName = 'Heading2Block';

/**
 * 見出し3ブロックをレンダリングするコンポーネント
 */
const Heading3Block = memo(({ block }: NotionBlockProps) => {
  return (
    <h3 className="text-xl font-bold mt-5 mb-2">
      <RichText richText={block.heading_3?.rich_text} />
    </h3>
  );
});

Heading3Block.displayName = 'Heading3Block';

/**
 * 箇条書きリストアイテムをレンダリングするコンポーネント
 */
const BulletedListItemBlock = memo(({ block }: NotionBlockProps) => {
  return (
    <li className="ml-5 list-disc mb-1">
      <RichText richText={block.bulleted_list_item?.rich_text} />
      {block.children && block.children.length > 0 && (
        <ul className="ml-5 mt-1">
          {block.children.map((child) => (
            <NotionBlock key={child.id} block={child} />
          ))}
        </ul>
      )}
    </li>
  );
});

BulletedListItemBlock.displayName = 'BulletedListItemBlock';

/**
 * 番号付きリストアイテムをレンダリングするコンポーネント
 */
const NumberedListItemBlock = memo(({ block }: NotionBlockProps) => {
  return (
    <li className="ml-5 list-decimal mb-1">
      <RichText richText={block.numbered_list_item?.rich_text} />
      {block.children && block.children.length > 0 && (
        <ol className="ml-5 mt-1">
          {block.children.map((child) => (
            <NotionBlock key={child.id} block={child} />
          ))}
        </ol>
      )}
    </li>
  );
});

NumberedListItemBlock.displayName = 'NumberedListItemBlock';

/**
 * ToDoブロックをレンダリングするコンポーネント
 */
const ToDoBlock = memo(({ block }: NotionBlockProps) => {
  return (
    <div className="flex items-start mb-1">
      <input type="checkbox" checked={block.to_do?.checked} readOnly className="mt-1 mr-2" />
      <div>
        <RichText richText={block.to_do?.rich_text} />
      </div>
    </div>
  );
});

ToDoBlock.displayName = 'ToDoBlock';

/**
 * トグルブロックをレンダリングするコンポーネント
 */
const ToggleBlock = memo(({ block }: NotionBlockProps) => {
  return (
    <details className="mb-4 border border-gray-200 rounded p-2">
      <summary className="cursor-pointer font-medium">
        <RichText richText={block.toggle?.rich_text} />
      </summary>
      {block.children && block.children.length > 0 && (
        <div className="mt-2 pl-4">
          {block.children.map((child) => (
            <NotionBlock key={child.id} block={child} />
          ))}
        </div>
      )}
    </details>
  );
});

ToggleBlock.displayName = 'ToggleBlock';

/**
 * コードブロックをレンダリングするコンポーネント
 */
const CodeBlock = memo(({ block }: NotionBlockProps) => {
  // 言語を取得（デフォルトはtext）
  const language = block.code?.language || 'text';

  // コードテキストを取得
  const codeText = (block.code?.rich_text ?? []).map((item) => item.plain_text).join('');

  return (
    <pre className="bg-gray-900 text-gray-100 p-4 rounded my-4 overflow-x-auto">
      <code className={`language-${language}`}>{codeText}</code>
    </pre>
  );
});

CodeBlock.displayName = 'CodeBlock';

/**
 * 引用ブロックをレンダリングするコンポーネント
 */
const QuoteBlock = memo(({ block }: NotionBlockProps) => {
  return (
    <blockquote className="border-l-4 border-gray-300 pl-4 py-1 my-4 italic">
      <RichText richText={block.quote?.rich_text} />
    </blockquote>
  );
});

QuoteBlock.displayName = 'QuoteBlock';

/**
 * 区切り線ブロックをレンダリングするコンポーネント
 */
const DividerBlock = memo(() => {
  return <hr className="my-6 border-t border-gray-300" />;
});

DividerBlock.displayName = 'DividerBlock';

/**
 * 画像ブロックをレンダリングするコンポーネント
 */
const ImageBlock = memo(({ block }: NotionBlockProps) => {
  const imageUrl =
    block.image?.type === 'external' ? block.image.external?.url : block.image?.file?.url;

  const altText =
    block.image?.caption && block.image.caption.length > 0
      ? block.image.caption.map((item) => item.plain_text).join(' ')
      : 'Notion image';

  if (!imageUrl) {
    return (
      <div className="my-4 p-2 border border-red-200 rounded text-red-500">
        画像URLが見つかりません
      </div>
    );
  }

  return (
    <figure className="my-6">
      <img
        src={imageUrl}
        alt={altText}
        className="mx-auto max-w-full rounded shadow-md"
        loading="lazy"
      />
      {block.image?.caption && block.image.caption.length > 0 && (
        <figcaption className="text-center text-gray-500 mt-2">
          <RichText richText={block.image.caption} />
        </figcaption>
      )}
    </figure>
  );
});

ImageBlock.displayName = 'ImageBlock';

/**
 * ブックマークブロックをレンダリングするコンポーネント
 */
const BookmarkBlock = memo(({ block }: NotionBlockProps) => {
  const url = block.bookmark?.url;

  if (!url) {
    return (
      <div className="my-4 p-2 border border-red-200 rounded text-red-500">
        ブックマークURLが見つかりません
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-gray-200 rounded p-4 my-4 hover:bg-gray-50 transition duration-150"
    >
      <div className="text-blue-500 hover:underline break-words">{url}</div>
      {block.bookmark?.caption && block.bookmark.caption.length > 0 && (
        <div className="text-gray-500 text-sm mt-1">
          <RichText richText={block.bookmark.caption} />
        </div>
      )}
    </a>
  );
});

BookmarkBlock.displayName = 'BookmarkBlock';

/**
 * コールアウトブロックをレンダリングするコンポーネント
 */
const CalloutBlock = memo(({ block }: NotionBlockProps) => {
  // アイコンがある場合はそれを表示
  const icon =
    block.callout?.icon?.type === 'emoji'
      ? block.callout.icon.emoji
      : block.callout?.icon?.type === 'external'
        ? '🔗'
        : '💡';

  return (
    <div className="flex bg-gray-100 p-4 rounded my-4 border-l-4 border-gray-300">
      <div className="mr-3 text-xl">{icon}</div>
      <div className="flex-1">
        <RichText richText={block.callout?.rich_text} />
      </div>
    </div>
  );
});

CalloutBlock.displayName = 'CalloutBlock';

/**
 * テーブルブロックをレンダリングするコンポーネント
 */
const TableBlock = memo(({ block }: NotionBlockProps) => {
  if (!block.children) {
    return (
      <div className="my-4 p-2 border border-red-200 rounded text-red-500">
        テーブルデータが見つかりません
      </div>
    );
  }

  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse">
        <tbody>
          {block.children.map((row, i) => {
            if (row.type !== 'table_row') return null;

            return (
              <tr
                key={row.id}
                className={i === 0 && block.table?.has_column_header ? 'bg-gray-100' : ''}
              >
                {row.table_row?.cells?.map((cell, j) => {
                  const Tag = i === 0 && block.table?.has_column_header ? 'th' : 'td';

                  return (
                    <Tag key={`${row.id}-${j}`} className="border border-gray-300 px-3 py-2">
                      <RichText richText={cell as RichTextItem[]} />
                    </Tag>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

TableBlock.displayName = 'TableBlock';

/**
 * カラムリストブロックをレンダリングするコンポーネント
 */
const ColumnListBlock = memo(({ block }: NotionBlockProps) => {
  if (!block.children) {
    return null;
  }

  return (
    <div className="flex flex-wrap my-4 -mx-2">
      {block.children.map((column) => (
        <div key={column.id} className="px-2 flex-1 min-w-[250px]">
          {column.children &&
            column.children.map((child) => <NotionBlock key={child.id} block={child} />)}
        </div>
      ))}
    </div>
  );
});

ColumnListBlock.displayName = 'ColumnListBlock';

/**
 * 埋め込みブロックをレンダリングするコンポーネント
 */
const EmbedBlock = memo(({ block }: NotionBlockProps) => {
  const url = block.embed?.url;

  if (!url) {
    return (
      <div className="my-4 p-2 border border-red-200 rounded text-red-500">
        埋め込みURLが見つかりません
      </div>
    );
  }

  return (
    <div className="my-4">
      <iframe
        src={url}
        className="w-full h-96 border-0 rounded shadow-md"
        allowFullScreen
        loading="lazy"
        title="Embedded content"
      />
      {block.embed?.caption && block.embed.caption.length > 0 && (
        <div className="text-center text-gray-500 mt-2">
          <RichText richText={block.embed.caption} />
        </div>
      )}
    </div>
  );
});

EmbedBlock.displayName = 'EmbedBlock';

/**
 * 埋め込みブロックをレンダリングするコンポーネント
 */
const LinkPreviewBlock = memo(({ block }: NotionBlockProps) => {
  const url = block.link_preview?.url;
  if (!url) {
    return (
      <div className="my-4 p-2 border border-red-200 rounded text-red-500">
        リンクプレビューURLが見つかりません
      </div>
    );
  } else {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block border border-gray-200 rounded p-4 my-4 hover:bg-gray-50 transition duration-150"
      >
        <div className="text-blue-500 hover:underline break-words">{url}</div>
      </a>
    );
  }
});

LinkPreviewBlock.displayName = 'LinkPreviewBlock';

/**
 * ビデオブロックをレンダリングするコンポーネント
 */
const VideoBlock = memo(({ block }: NotionBlockProps) => {
  const videoUrl =
    block.video?.type === 'external' ? block.video.external?.url : block.video?.file?.url;

  if (!videoUrl) {
    return (
      <div className="my-4 p-2 border border-red-200 rounded text-red-500">
        動画URLが見つかりません
      </div>
    );
  }

  return (
    <div className="my-6">
      <iframe
        src={videoUrl}
        className="w-full h-96 border-0 rounded shadow-md"
        allowFullScreen
        loading="lazy"
        title="Video content"
      />
      {block.video?.caption && block.video.caption.length > 0 && (
        <div className="text-center text-gray-500 mt-2">
          <RichText richText={block.video.caption} />
        </div>
      )}
    </div>
  );
});

VideoBlock.displayName = 'VideoBlock';

/**
 * 数式ブロックをレンダリングするコンポーネント
 */
const EquationBlock = memo(({ block }: NotionBlockProps) => {
  const expression = block.equation?.expression;

  if (!expression) {
    return (
      <div className="my-4 p-2 border border-red-200 rounded text-red-500">
        数式が見つかりません
      </div>
    );
  }

  // MathJaxが利用可能ならそれを使用（ここでは単純にテキスト表示）
  return <div className="my-4 p-4 bg-gray-50 rounded overflow-x-auto font-mono">{expression}</div>;
});

EquationBlock.displayName = 'EquationBlock';

/**
 * サポートされていないブロックタイプ用のフォールバックコンポーネント
 */
const UnsupportedBlock = memo(({ block }: NotionBlockProps) => {
  return (
    <div className="my-4 p-2 border border-gray-200 rounded text-sm">
      <p className="text-gray-500">サポートされていないブロックタイプ: {block.type}</p>
    </div>
  );
});

UnsupportedBlock.displayName = 'UnsupportedBlock';

/**
 * ブロックタイプに応じたコンポーネントを選択する関数
 */
function getBlockComponent(block: NotionBlockWithChildren): React.ReactNode {
  switch (block.type) {
    case 'paragraph':
      return <ParagraphBlock block={block} />;
    case 'heading_1':
      return <Heading1Block block={block} />;
    case 'heading_2':
      return <Heading2Block block={block} />;
    case 'heading_3':
      return <Heading3Block block={block} />;
    case 'bulleted_list_item':
      return <BulletedListItemBlock block={block} />;
    case 'numbered_list_item':
      return <NumberedListItemBlock block={block} />;
    case 'to_do':
      return <ToDoBlock block={block} />;
    case 'toggle':
      return <ToggleBlock block={block} />;
    case 'code':
      return <CodeBlock block={block} />;
    case 'quote':
      return <QuoteBlock block={block} />;
    case 'divider':
      return <DividerBlock />;
    case 'image':
      return <ImageBlock block={block} />;
    case 'bookmark':
      return <BookmarkBlock block={block} />;
    case 'callout':
      return <CalloutBlock block={block} />;
    case 'table':
      return <TableBlock block={block} />;
    case 'column_list':
      return <ColumnListBlock block={block} />;
    case 'embed':
      return <EmbedBlock block={block} />;
    case 'video':
      return <VideoBlock block={block} />;
    case 'equation':
      return <EquationBlock block={block} />;
    case 'link_preview':
      return <LinkPreviewBlock block={block} />;
    default:
      return <UnsupportedBlock block={block} />;
  }
}

/**
 * Notionブロックをレンダリングするメインコンポーネント
 */
const NotionBlock = memo(({ block }: NotionBlockProps) => {
  if (!block) return null;

  return getBlockComponent(block);
});

NotionBlock.displayName = 'NotionBlock';

/**
 * ブロックリストをグループ化して最適化する関数
 * @param blocks ブロックの配列
 * @returns グループ化されたReactノード
 */
function groupBlocks(blocks: NotionBlockWithChildren[]): React.ReactNode[] {
  if (!blocks || blocks.length === 0) {
    return [
      <p key="empty" className="text-gray-500 italic">
        コンテンツがありません
      </p>,
    ];
  }

  const groupedBlocks: React.ReactNode[] = [];
  let currentListItems: React.ReactNode[] = [];
  let currentListType: 'ul' | 'ol' | null = null;

  // ブロック配列を処理
  blocks.forEach((block, index) => {
    if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
      // 新しいリストタイプを決定
      const newListType = block.type === 'bulleted_list_item' ? 'ul' : 'ol';

      // リストタイプの変更をチェック
      if (currentListType !== newListType) {
        // 以前のリストがあれば追加
        if (currentListItems.length > 0) {
          const ListTag = currentListType === 'ul' ? 'ul' : 'ol';
          groupedBlocks.push(
            <ListTag key={`list-${index}`} className="my-4">
              {currentListItems}
            </ListTag>
          );
          currentListItems = [];
        }

        // 新しいリストタイプに変更
        currentListType = newListType;
      }

      // リストアイテムを追加
      currentListItems.push(<NotionBlock key={block.id} block={block} />);
    } else {
      // リストでないブロックの場合、現在のリストを追加して新しいブロックを開始
      if (currentListItems.length > 0) {
        const ListTag = currentListType === 'ul' ? 'ul' : 'ol';
        groupedBlocks.push(
          <ListTag key={`list-${index}`} className="my-4">
            {currentListItems}
          </ListTag>
        );
        currentListItems = [];
        currentListType = null;
      }

      // 通常のブロックを追加
      groupedBlocks.push(<NotionBlock key={block.id} block={block} />);
    }
  });

  // 最後のリストがあれば追加
  if (currentListItems.length > 0) {
    const ListTag = currentListType === 'ul' ? 'ul' : 'ol';
    groupedBlocks.push(
      <ListTag key="list-last" className="my-4">
        {currentListItems}
      </ListTag>
    );
  }

  return groupedBlocks;
}

/**
 * ブロックのリストをレンダリングするコンポーネント
 */
export const NotionBlocks = memo(({ blocks }: NotionBlocksProps) => {
  // ブロックをグループ化（メモ化して再レンダリングを防止）
  const groupedBlocks = useMemo(() => groupBlocks(blocks), [blocks]);

  return <div className="notion-content">{groupedBlocks}</div>;
});

NotionBlocks.displayName = 'NotionBlocks';

/**
 * リストブロックを最適化してレンダリングするユーティリティ関数
 * @param blocks ブロックの配列
 * @returns 最適化されたレンダリング結果
 */
export function renderOptimizedBlocks(blocks: NotionBlockWithChildren[]): React.ReactNode {
  return <NotionBlocks blocks={blocks} />;
}

export default NotionBlock;
