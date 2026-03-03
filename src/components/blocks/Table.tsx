/**
 * テーブルブロックコンポーネント
 */

import React, { memo } from "react";
import type { NotionBlockProps, RichTextItem } from "@/types/notion";
import { RichText } from "./RichText";

/**
 * テーブルブロックをレンダリングするコンポーネント
 */
export const TableBlock = memo(({ block }: NotionBlockProps) => {
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
            if (row.type !== "table_row") return null;

            return (
              <tr
                key={row.id}
                className={i === 0 && block.table?.has_column_header ? "bg-gray-100" : ""}
              >
                {row.table_row?.cells?.map((cell, j) => {
                  const Tag = i === 0 && block.table?.has_column_header ? "th" : "td";

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

TableBlock.displayName = "TableBlock";
