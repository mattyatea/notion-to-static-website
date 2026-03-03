/**
 * Notion API module barrel export
 * @file Re-exports all public APIs from the notion module
 */

// Client and configuration
export { notion, NOTION_DATABASE_ID, log } from './client';

// Caching utilities
export { getFromCacheOrFetch, clearCache } from './cache';

// Database operations
export { formatPage, formatPages, getFormattedDatabase } from './database';

// Page operations
export { getPage, getBlocks, getFormattedPage, getPageBySlug } from './page';

// Tag and category operations
export {
  getAllTags,
  getPagesByTag,
  getAllCategories,
  getPagesByCategory,
  searchPages,
} from './tags';
