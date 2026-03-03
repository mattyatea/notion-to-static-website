/**
 * メディアブロックコンポーネント (画像、動画、埋め込み、ブックマーク)
 */

import React, { memo } from "react";
import type { NotionBlockProps } from "@/types/notion";
import type { RichTextItem } from "@/types/notion";
import { RichText } from "./RichText";

/**
 * 画像ブロックをレンダリングするコンポーネント
 */
export const ImageBlock = memo(({ block }: NotionBlockProps) => {
  const imageUrl =
    block.image?.type === "external" ? block.image.external?.url : block.image?.file?.url;

  const altText =
    block.image?.caption && block.image.caption.length > 0
      ? block.image.caption.map((item) => item.plain_text).join(" ")
      : "Notion image";

  if (!imageUrl) {
    return (
      <div className="my-4 p-2 border border-red-200 rounded text-red-500">
        画像URLが見つかりません
      </div>
    );
  }

  return (
    <figure className="my-6">
      <img
        src={imageUrl}
        alt={altText}
        className="mx-auto max-w-full rounded shadow-md transition-transform duration-200 hover:scale-105"
        loading="lazy"
      />
      {block.image?.caption && block.image.caption.length > 0 && (
        <figcaption className="text-center text-gray-500 mt-2">
          <RichText richText={block.image.caption} />
        </figcaption>
      )}
    </figure>
  );
});

ImageBlock.displayName = "ImageBlock";

/**
 * ビデオブロックをレンダリングするコンポーネント
 */
export const VideoBlock = memo(({ block }: NotionBlockProps) => {
  const videoUrl =
    block.video?.type === "external" ? block.video.external?.url : block.video?.file?.url;

  if (!videoUrl) {
    return (
      <div className="my-4 p-2 border border-red-200 rounded text-red-500">
        動画URLが見つかりません
      </div>
    );
  }

  return (
    <div className="my-6">
      <iframe
        src={videoUrl}
        className="w-full h-96 border-0 rounded shadow-md transition-transform duration-200 hover:scale-105"
        allowFullScreen
        loading="lazy"
        title="Video content"
      />
      {block.video?.caption && block.video.caption.length > 0 && (
        <div className="text-center text-gray-500 mt-2">
          <RichText richText={block.video.caption} />
        </div>
      )}
    </div>
  );
});

VideoBlock.displayName = "VideoBlock";

/**
 * 埋め込みブロックをレンダリングするコンポーネント
 */
export const EmbedBlock = memo(({ block }: NotionBlockProps) => {
  const url = block.embed?.url;

  if (!url) {
    return (
      <div className="my-4 p-2 border border-red-200 rounded text-red-500">
        埋め込みURLが見つかりません
      </div>
    );
  }

  return (
    <div className="my-4">
      <iframe
        src={url}
        className="w-full h-96 border-0 rounded shadow-md transition-transform duration-200 hover:scale-105"
        allowFullScreen
        loading="lazy"
        title="Embedded content"
      />
      {block.embed?.caption && block.embed.caption.length > 0 && (
        <div className="text-center text-gray-500 mt-2">
          <RichText richText={block.embed.caption} />
        </div>
      )}
    </div>
  );
});

EmbedBlock.displayName = "EmbedBlock";

/**
 * ブックマークブロックをレンダリングするコンポーネント
 */
export const BookmarkBlock = memo(({ block }: NotionBlockProps) => {
  const url = block.bookmark?.url;

  if (!url) {
    return (
      <div className="my-4 p-2 border border-red-200 rounded text-red-500">
        ブックマークURLが見つかりません
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-gray-200 rounded p-4 my-4 hover:bg-gray-50 transition duration-150"
    >
      <div className="text-blue-500 hover:underline break-words">{url}</div>
      {block.bookmark?.caption && block.bookmark.caption.length > 0 && (
        <div className="text-gray-500 text-sm mt-1">
          <RichText richText={block.bookmark.caption} />
        </div>
      )}
    </a>
  );
});

BookmarkBlock.displayName = "BookmarkBlock";

/**
 * リンクプレビューブロックをレンダリングするコンポーネント
 */
export const LinkPreviewBlock = memo(({ block }: NotionBlockProps) => {
  const url = block.link_preview?.url;
  if (!url) {
    return (
      <div className="my-4 p-2 border border-red-200 rounded text-red-500">
        リンクプレビューURLが見つかりません
      </div>
    );
  } else {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block border border-gray-200 rounded p-4 my-4 hover:bg-gray-50 transition duration-150"
      >
        <div className="text-blue-500 hover:underline break-words">{url}</div>
      </a>
    );
  }
});

LinkPreviewBlock.displayName = "LinkPreviewBlock";

/**
 * 数式ブロックをレンダリングするコンポーネント
 */
export const EquationBlock = memo(({ block }: NotionBlockProps) => {
  const expression = block.equation?.expression;

  if (!expression) {
    return (
      <div className="my-4 p-2 border border-red-200 rounded text-red-500">
        数式が見つかりません
      </div>
    );
  }

  // MathJaxが利用可能ならそれを使用（ここでは単純にテキスト表示）
  return <div className="my-4 p-4 bg-gray-50 rounded overflow-x-auto font-mono">{expression}</div>;
});

EquationBlock.displayName = "EquationBlock";
