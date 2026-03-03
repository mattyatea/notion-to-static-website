/**
 * リッチテキストのレンダリングコンポーネント
 * @file Notionのリッチテキストアイテムをスタイル付きでレンダリングします
 */

import React, { memo } from "react";
import type { RichTextItem } from "@/types/notion";

/**
 * リッチテキストのスタイル情報を計算する関数
 * @param annotations アノテーション情報
 * @param type
 * @returns TailwindCSSクラス名
 */
export function getStyleClasses(annotations: RichTextItem["annotations"], type: string): string {
  const classes: string[] = [];

  // 色の適用
  if (annotations.color && annotations.color !== "default") {
    if (annotations.color.includes("_background")) {
      const bgColor = annotations.color.replace("_background", "");
      classes.push(`bg-${bgColor}-100 text-${bgColor}-800 px-1 rounded`);
    } else {
      classes.push(`text-${annotations.color}-500`);
    }
  }

  // codeブロックの場合のスタイル
  if (type === "code") {
    classes.push("bg-gray-100 p-1 rounded font-mono text-sm");
  }

  return classes.join(" ");
}

/**
 * リッチテキストをレンダリングする関数
 * @param richText リッチテキストアイテムの配列
 * @returns レンダリングされたリッチテキスト
 */
export const RichText = memo(({ richText }: { richText?: RichTextItem[] }) => {
  if (!richText || richText.length === 0) {
    return null;
  }

  return (
    <>
      {richText.map((text, index) => {
        const { annotations, plain_text, href, type } = text;
        const { bold, italic, strikethrough, underline, code } = annotations;

        // スタイルクラスを取得
        const styleClass = getStyleClasses(annotations, type);

        // コンテンツ要素
        let content = <>{plain_text}</>;

        // スタイルを内側から外側へ適用
        if (code) {
          content = (
            <code key={`code-${index}`} className="font-mono text-sm bg-gray-100 p-1 rounded">
              {content}
            </code>
          );
        }
        if (bold) {
          content = <strong key={`bold-${index}`}>{content}</strong>;
        }
        if (italic) {
          content = <em key={`italic-${index}`}>{content}</em>;
        }
        if (strikethrough) {
          content = <del key={`del-${index}`}>{content}</del>;
        }
        if (underline) {
          content = <u key={`underline-${index}`}>{content}</u>;
        }

        // リンクの処理
        if (href) {
          return (
            <a
              key={index}
              href={href}
              className={`text-blue-500 hover:underline ${styleClass}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {content}
            </a>
          );
        }

        // 通常のテキスト
        return (
          <span key={index} className={styleClass || undefined}>
            {content}
          </span>
        );
      })}
    </>
  );
});

RichText.displayName = "RichText";
