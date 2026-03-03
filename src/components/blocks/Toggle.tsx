/**
 * トグルブロックコンポーネント
 */

import React, { memo } from 'react';
import type { NotionBlockProps } from '@/types/notion';
import { RichText } from './RichText';
import NotionBlock from './index';

/**
 * トグルブロックをレンダリングするコンポーネント
 */
export const ToggleBlock = memo(({ block }: NotionBlockProps) => {
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
