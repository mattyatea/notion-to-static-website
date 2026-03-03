/**
 * Notion API client initialization and logging utilities
 * @file Provides the authenticated Notion client instance and logging functions
 */

import { Client } from "@notionhq/client";
import "dotenv/config";

// Environment variables
const NOTION_API_KEY = process.env.NOTION_API_KEY;
export const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

// Validate required environment variables
if (!NOTION_API_KEY) {
  throw new Error("NOTION_API_KEY is required but not set in environment variables");
}

if (!NOTION_DATABASE_ID) {
  throw new Error("NOTION_DATABASE_ID is required but not set in environment variables");
}

/**
 * Authenticated Notion API client instance
 */
export const notion = new Client({
  auth: NOTION_API_KEY,
});

/**
 * Logging wrapper function with timestamp and context
 * @param level Log level
 * @param message Log message
 * @param data Additional data to log
 */
export function log(level: "info" | "warn" | "error" | "debug", message: string, data?: unknown) {
  if (process.env.NODE_ENV !== "development") {
    return; // Only log in development environment
  }
  const timestamp = new Date().toISOString();
  const prefix = `[Notion API] ${timestamp}`;

  switch (level) {
    case "info":
      console.info(`${prefix} INFO: ${message}`, data ? data : "");
      break;
    case "warn":
      console.warn(`${prefix} WARNING: ${message}`, data ? data : "");
      break;
    case "error":
      console.error(`${prefix} ERROR: ${message}`, data ? data : "");
      break;
    case "debug":
      console.debug(`${prefix} DEBUG: ${message}`, data ? data : "");
      break;
  }
}
