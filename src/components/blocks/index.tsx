import React, { memo, useMemo } from 'react';
import type { NotionBlockProps, NotionBlocksProps, NotionBlockWithChildren } from '@/types/notion';

import { ParagraphBlock } from './Paragraph';
import { Heading1Block, Heading2Block, Heading3Block } from './Heading';
import { BulletedListItemBlock, NumberedListItemBlock, ToDoBlock } from './List';
import { ToggleBlock } from './Toggle';
import { CodeBlock } from './Code';
import { QuoteBlock, CalloutBlock } from './Quote';
import { DividerBlock } from './Divider';
import {
  ImageBlock,
  VideoBlock,
  EmbedBlock,
  BookmarkBlock,
  LinkPreviewBlock,
  EquationBlock,
} from './Media';
import { TableBlock } from './Table';
import { ColumnListBlock } from './Column';

const UnsupportedBlock = memo(({ block }: NotionBlockProps) => {
  return (
    <div className="my-4 p-2 border border-gray-200 rounded text-sm">
      <p className="text-gray-500">サポートされていないブロックタイプ: {block.type}</p>
    </div>
  );
});

UnsupportedBlock.displayName = 'UnsupportedBlock';

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

const NotionBlock = memo(({ block }: NotionBlockProps) => {
  if (!block) return null;

  return getBlockComponent(block);
});

NotionBlock.displayName = 'NotionBlock';

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

export const NotionBlocks = memo(({ blocks }: NotionBlocksProps) => {
  const groupedBlocks = useMemo(() => groupBlocks(blocks), [blocks]);
  return <div className="notion-content">{groupedBlocks}</div>;
});

NotionBlocks.displayName = 'NotionBlocks';

export function renderOptimizedBlocks(blocks: NotionBlockWithChildren[]): React.ReactNode {
  return <NotionBlocks blocks={blocks} />;
}

export { RichText, getStyleClasses } from './RichText';
export { ParagraphBlock } from './Paragraph';
export { Heading1Block, Heading2Block, Heading3Block } from './Heading';
export { BulletedListItemBlock, NumberedListItemBlock, ToDoBlock } from './List';
export { ToggleBlock } from './Toggle';
export { CodeBlock } from './Code';
export { QuoteBlock, CalloutBlock } from './Quote';
export { DividerBlock } from './Divider';
export {
  ImageBlock,
  VideoBlock,
  EmbedBlock,
  BookmarkBlock,
  LinkPreviewBlock,
  EquationBlock,
} from './Media';
export { TableBlock } from './Table';
export { ColumnListBlock } from './Column';

export default NotionBlock;
