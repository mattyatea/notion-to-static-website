import type {
  DatabaseQueryResponse,
  FormattedPage,
  NotionBlockWithChildren,
  PageData,
  PageResponse,
} from "@/types/notion";
import { getFromCacheOrFetch } from "./cache";
import { log, NOTION_DATABASE_ID } from "./client";
import { queryNotionCollection } from "./query";

/**
 * ページオブジェクトをフォーマット済みのページに変換する
 * @param page ページオブジェクト
 * @param blocks ブロック情報（オプション）
 * @returns フォーマット済みのページ
 */
export function formatPage(page: PageResponse, blocks?: NotionBlockWithChildren[]): FormattedPage {
  const properties = page.properties as PageData;
  log("debug", `Formatting page: ${page.id}`, {
    title: properties.title?.title[0]?.plain_text || "無題",
  });

  let title = "無題";
  if (properties.title?.title?.[0]?.plain_text) {
    title = properties.title.title[0].plain_text;
  }

  let slug = page.id;
  if (properties.slug?.rich_text?.[0]?.plain_text) {
    slug = properties.slug.rich_text[0].plain_text;
  }

  let thumbnail = undefined;
  if (properties.thumbnail?.files?.[0]) {
    const thumb = properties.thumbnail.files[0];
    thumbnail = {
      type: thumb.type || "external",
      url: thumb.file?.url || thumb.external?.url || "",
    };
  } else if (page.cover) {
    thumbnail = {
      type: page.cover.type,
      url:
        page.cover.type === "external"
          ? page.cover.external?.url || ""
          : page.cover.file?.url || "",
    };
  }

  const dateStr = properties.date?.date?.start || page.created_time || new Date().toISOString();
  const updatedAtStr = properties.updatedAt?.last_edited_time || page.last_edited_time || dateStr;

  const tags =
    properties.tags?.multi_select.map((tag: { name: string; color: string }) => ({
      name: tag.name,
      color: tag.color,
    })) || [];

  let author = undefined;
  if (properties.author?.people?.[0]) {
    const personData = properties.author.people[0];
    author = {
      name: personData.name,
      avatar_url: personData.avatar_url,
    };
  }

  const category = properties.category?.select?.name;
  const status = properties.status?.select?.name;
  const summary = properties.summary?.rich_text?.[0]?.plain_text || "";

  const keywords = properties.keywords?.rich_text?.[0]?.plain_text
    ? properties.keywords.rich_text[0].plain_text.split(",").map((k) => k.trim())
    : [];

  return {
    id: page.id,
    title,
    summary,
    slug,
    author,
    keywords,
    category,
    tags,
    blocks: blocks || [],
    thumbnail,
    date: new Date(dateStr).toISOString(),
    updatedAt: new Date(updatedAtStr).toISOString(),
    status,
  };
}

/**
 * 複数のページをフォーマット済みのページリストに変換する
 * @param pages ページオブジェクトの配列
 * @returns フォーマット済みのページの配列
 */
export function formatPages(pages: PageResponse[]): FormattedPage[] {
  log("debug", `Formatting ${pages.length} pages`);
  return pages.map((page) => formatPage(page));
}

/**
 * データベースからページリストを整形して取得する
 * @param filterByStatus 特定のステータスでフィルタリングするかどうか
 * @param status フィルタリングするステータス (デフォルト: "Public")
 * @returns 整形されたページリスト
 * @throws データベースの取得・整形に失敗した場合のエラー
 */
export async function getFormattedDatabase(
  filterByStatus = true,
  status = "Public",
): Promise<FormattedPage[]> {
  if (!NOTION_DATABASE_ID) {
    const error = new Error("NOTION_DATABASE_IDが設定されていません");
    log("error", error.message);
    throw error;
  }
  const databaseId = NOTION_DATABASE_ID;

  log(
    "info",
    `Getting formatted database (filter by status: ${filterByStatus}, status: ${status})`,
  );

  return getFromCacheOrFetch(`formatted-database:${filterByStatus}:${status}`, async () => {
    try {
      interface QueryOptions {
        sorts: {
          property: string;
          direction: "ascending" | "descending";
        }[];
        filter?: {
          property: string;
          select: {
            equals: string;
          };
        };
        start_cursor?: string;
      }

      const queryOptions: QueryOptions = {
        sorts: [{ property: "date", direction: "descending" }],
      };

      if (filterByStatus) {
        queryOptions.filter = {
          property: "status",
          select: { equals: status },
        };
      }

      let allPages: PageResponse[] = [];
      let hasMore = true;
      let cursor: string | undefined;

      while (hasMore) {
        const response = await queryNotionCollection(databaseId, {
          ...queryOptions,
          ...(cursor ? { start_cursor: cursor } : {}),
        });

        allPages = [...allPages, ...response.results];
        hasMore = response.has_more;
        cursor = response.next_cursor || undefined;
      }

      log("debug", `Found ${allPages.length} pages in database`);

      return formatPages(allPages);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "不明なエラー";
      log("error", "Failed to format database:", error);

      let detailedMessage = `データベースの取得・整形に失敗しました: ${errorMsg}`;

      if (errorMsg.includes("404")) {
        detailedMessage = `データベースが見つかりません (ID: ${NOTION_DATABASE_ID})`;
      } else if (errorMsg.includes("401") || errorMsg.includes("403")) {
        detailedMessage = `データベースへのアクセス権限がありません (ID: ${NOTION_DATABASE_ID})`;
      }

      throw new Error(detailedMessage);
    }
  });
}
