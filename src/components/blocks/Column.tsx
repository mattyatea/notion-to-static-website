/**
 * カラムブロックコンポーネント
 */

import React, { memo } from "react";
import type { NotionBlockProps } from "@/types/notion";
import NotionBlock from "./index";

/**
 * カラムリストをレンダリングするコンポーネント
 */
export const ColumnListBlock = memo(({ block }: NotionBlockProps) => {
  return (
    <div className="flex gap-4 my-4">
      {block.children &&
        block.children.map((child) => (
          <div key={child.id} className="flex-1 border border-gray-200 rounded p-2">
            {child.children &&
              child.children.map((nestedChild) => (
                <NotionBlock key={nestedChild.id} block={nestedChild} />
              ))}
          </div>
        ))}
    </div>
  );
});

ColumnListBlock.displayName = "ColumnListBlock";
