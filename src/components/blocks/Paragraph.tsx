/**
 * 段落ブロックコンポーネント
 */

import React, { memo } from 'react';
import type { NotionBlockProps } from '@/types/notion';
import { RichText } from './RichText';

/**
 * 段落ブロックをレンダリングするコンポーネント
 */
export const ParagraphBlock = memo(({ block }: NotionBlockProps) => {
  return (
    <p className="mb-4" data-testid="block-paragraph">
      <RichText richText={block.paragraph?.rich_text} />
    </p>
  );
});

ParagraphBlock.displayName = 'ParagraphBlock';
