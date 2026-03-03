/**
 * 区切り線ブロックコンポーネント
 */

import React, { memo } from "react";

/**
 * 区切り線ブロックをレンダリングするコンポーネント
 */
export const DividerBlock = memo(() => {
  return <hr className="my-6 border-t border-gray-300" />;
});

DividerBlock.displayName = "DividerBlock";
