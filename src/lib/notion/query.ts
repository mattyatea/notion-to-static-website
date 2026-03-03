import { APIErrorCode, isNotionClientError } from "@notionhq/client";
import type { DatabaseQueryResponse } from "@/types/notion";
import { isDatabaseQueryResponse } from "@/types/notion";
import { log, notion } from "./client";

type DataSourceQueryArgs = Omit<Parameters<typeof notion.dataSources.query>[0], "data_source_id">;
const dataSourceIdCache = new Map<string, string>();

export function clearDataSourceIdCache(): void {
  dataSourceIdCache.clear();
}

function shouldFallbackToLegacyDatabaseQuery(error: unknown): boolean {
  if (isNotionClientError(error)) {
    return error.code === APIErrorCode.ObjectNotFound;
  }

  if (error instanceof Error) {
    return (
      error.message.includes("Could not find database with ID") ||
      error.message.includes("Could not find data source with ID")
    );
  }

  return false;
}

async function resolveDataSourceId(
  dataSourceOrDatabaseId: string,
  forceRefresh = false,
): Promise<string> {
  const cachedDataSourceId = dataSourceIdCache.get(dataSourceOrDatabaseId);
  if (!forceRefresh && cachedDataSourceId) {
    return cachedDataSourceId;
  }

  try {
    const database = await notion.databases.retrieve({
      database_id: dataSourceOrDatabaseId,
    });

    if (
      typeof database === "object" &&
      database !== null &&
      "data_sources" in database &&
      Array.isArray(database.data_sources)
    ) {
      const resolvedDataSourceId = database.data_sources[0]?.id;
      if (resolvedDataSourceId) {
        dataSourceIdCache.set(dataSourceOrDatabaseId, resolvedDataSourceId);
        dataSourceIdCache.set(resolvedDataSourceId, resolvedDataSourceId);
        return resolvedDataSourceId;
      }
    }
  } catch (error) {
    if (!shouldFallbackToLegacyDatabaseQuery(error)) {
      throw error;
    }
  }

  dataSourceIdCache.set(dataSourceOrDatabaseId, dataSourceOrDatabaseId);
  return dataSourceOrDatabaseId;
}

export async function queryNotionCollection(
  dataSourceOrDatabaseId: string,
  args: DataSourceQueryArgs,
): Promise<DatabaseQueryResponse> {
  const resolvedDataSourceId = await resolveDataSourceId(dataSourceOrDatabaseId);

  try {
    const response = await notion.dataSources.query({
      data_source_id: resolvedDataSourceId,
      ...args,
    });

    if (!isDatabaseQueryResponse(response)) {
      throw new Error("Notion APIから期待するデータベース形式を取得できませんでした");
    }

    return response;
  } catch (error) {
    if (!shouldFallbackToLegacyDatabaseQuery(error)) {
      throw error;
    }

    if (resolvedDataSourceId !== dataSourceOrDatabaseId) {
      throw error;
    }

    log("warn", `Retrying with resolved data source for ${dataSourceOrDatabaseId}.`);

    const retriedDataSourceId = await resolveDataSourceId(dataSourceOrDatabaseId, true);
    if (retriedDataSourceId === dataSourceOrDatabaseId) {
      throw error;
    }

    const fallbackResponse = await notion.dataSources.query({
      data_source_id: retriedDataSourceId,
      ...args,
    });

    if (!isDatabaseQueryResponse(fallbackResponse)) {
      throw new Error("Notion APIから期待するデータベース形式を取得できませんでした");
    }

    return fallbackResponse;
  }
}
