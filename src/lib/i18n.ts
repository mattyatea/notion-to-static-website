export const SUPPORTED_LOCALES = ["ja", "en"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "ja";
export const LOCALE_STORAGE_KEY = "locale";

export const I18N_MESSAGES: Record<SupportedLocale, Record<string, string>> = {
  ja: {
    "nav.home": "ホーム",
    "nav.blog": "ブログ",
    "nav.language": "言語",
    "nav.languageEnglish": "English",
    "nav.languageJapanese": "日本語",

    "theme.toggleLabel": "テーマを切り替え",

    "home.latestPosts": "最新の記事",
    "home.viewAllPosts": "すべての記事を見る",
    "home.emptyPosts": "投稿がまだありません。",

    "posts.title": "ブログ記事一覧",
    "posts.empty": "投稿が見つかりませんでした。",

    "tags.title": "タグ: {tag}",
    "tags.description": "「{tag}」タグがついた記事の一覧です",
    "tags.emptyTitle": "記事が見つかりません",
    "tags.emptyDescription": "「{tag}」タグのついた記事はまだありません。",
    "tags.backToPosts": "すべての記事に戻る",

    "post.notFound": "ページが見つかりませんでした。",
    "post.backToList": "← 一覧に戻る",
    "post.publishedDate": "公開日: {date}",

    "postCard.readAria": "{title}を読む",
    "postCard.noImage": "画像なし",

    "common.error": "エラー:",
    "common.fetchFailed": "データの取得に失敗しました。",
    "common.pageFetchFailed": "ページの取得に失敗しました。",

    "footer.rightsReserved": "All rights reserved.",
  },
  en: {
    "nav.home": "Home",
    "nav.blog": "Blog",
    "nav.language": "Language",
    "nav.languageEnglish": "English",
    "nav.languageJapanese": "Japanese",

    "theme.toggleLabel": "Toggle theme",

    "home.latestPosts": "Latest Posts",
    "home.viewAllPosts": "View all posts",
    "home.emptyPosts": "No posts yet.",

    "posts.title": "Blog Posts",
    "posts.empty": "No posts were found.",

    "tags.title": "Tag: {tag}",
    "tags.description": 'A list of posts tagged "{tag}".',
    "tags.emptyTitle": "No posts found",
    "tags.emptyDescription": 'There are no posts tagged "{tag}" yet.',
    "tags.backToPosts": "Back to all posts",

    "post.notFound": "Page was not found.",
    "post.backToList": "<- Back to list",
    "post.publishedDate": "Published: {date}",

    "postCard.readAria": "Read {title}",
    "postCard.noImage": "No image",

    "common.error": "Error:",
    "common.fetchFailed": "Failed to fetch data.",
    "common.pageFetchFailed": "Failed to fetch page.",

    "footer.rightsReserved": "All rights reserved.",
  },
};
