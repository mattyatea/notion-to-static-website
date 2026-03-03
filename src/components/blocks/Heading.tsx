/**
 * 見出しブロックコンポーネント
 */

import React, { memo } from "react";
import type { NotionBlockProps } from "@/types/notion";
import { RichText } from "./RichText";

/**
 * 見出し1ブロックをレンダリングするコンポーネント
 */
export const Heading1Block = memo(({ block }: NotionBlockProps) => {
  return (
    <h1 className="text-3xl font-bold mt-8 mb-4">
      <RichText richText={block.heading_1?.rich_text} />
    </h1>
  );
});

Heading1Block.displayName = "Heading1Block";

/**
 * 見出し2ブロックをレンダリングするコンポーネント
 */
export const Heading2Block = memo(({ block }: NotionBlockProps) => {
  return (
    <h2 className="text-2xl font-bold mt-6 mb-3">
      <RichText richText={block.heading_2?.rich_text} />
    </h2>
  );
});

Heading2Block.displayName = "Heading2Block";

/**
 * 見出し3ブロックをレンダリングするコンポーネント
 */
export const Heading3Block = memo(({ block }: NotionBlockProps) => {
  return (
    <h3 className="text-xl font-bold mt-5 mb-2">
      <RichText richText={block.heading_3?.rich_text} />
    </h3>
  );
});

Heading3Block.displayName = "Heading3Block";
