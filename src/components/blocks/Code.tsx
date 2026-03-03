/**
 * コードブロックコンポーネント
 */

import React, { memo } from 'react';
import type { NotionBlockProps } from '@/types/notion';

/**
 * コードブロックをレンダリングするコンポーネント
 */
export const CodeBlock = memo(({ block }: NotionBlockProps) => {
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
