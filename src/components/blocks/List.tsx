/**
 * リストブロックコンポーネント
 */

import React, { memo } from "react";
import type { NotionBlockProps } from "@/types/notion";
import { RichText } from "./RichText";
import NotionBlock from "./index";

/**
 * 箇条書きリストアイテムをレンダリングするコンポーネント
 */
export const BulletedListItemBlock = memo(({ block }: NotionBlockProps) => {
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

BulletedListItemBlock.displayName = "BulletedListItemBlock";

/**
 * 番号付きリストアイテムをレンダリングするコンポーネント
 */
export const NumberedListItemBlock = memo(({ block }: NotionBlockProps) => {
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

NumberedListItemBlock.displayName = "NumberedListItemBlock";

/**
 * ToDoブロックをレンダリングするコンポーネント
 */
export const ToDoBlock = memo(({ block }: NotionBlockProps) => {
  return (
    <div className="flex items-start mb-2">
      <input type="checkbox" checked={block.to_do?.checked} readOnly className="mt-1 mr-2" />
      <div>
        <RichText richText={block.to_do?.rich_text} />
        {block.children && block.children.length > 0 && (
          <div className="ml-6 mt-1">
            {block.children.map((child) => (
              <NotionBlock key={child.id} block={child} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

ToDoBlock.displayName = "ToDoBlock";
