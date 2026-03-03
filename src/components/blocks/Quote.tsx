/**
 * 引用とコールアウトブロックコンポーネント
 */

import React, { memo } from 'react';
import type { NotionBlockProps } from '@/types/notion';
import { RichText } from './RichText';

/**
 * 引用ブロックをレンダリングするコンポーネント
 */
export const QuoteBlock = memo(({ block }: NotionBlockProps) => {
  return (
    <blockquote className="border-l-4 border-gray-300 pl-4 py-1 my-4 italic">
      <RichText richText={block.quote?.rich_text} />
    </blockquote>
  );
});

QuoteBlock.displayName = 'QuoteBlock';

/**
 * コールアウトブロックをレンダリングするコンポーネント
 */
export const CalloutBlock = memo(({ block }: NotionBlockProps) => {
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
