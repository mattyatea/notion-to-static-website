import type { APIContext, APIRoute } from "astro";
import { getAllTags, getFormattedDatabase } from "@/lib/notion";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const GET: APIRoute = async (context: APIContext) => {
  const siteUrl =
    import.meta.env.PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    context.site?.toString().replace(/\/$/, "");

  if (!siteUrl) {
    return new Response(
      "PUBLIC_SITE_URL environment variable is required to generate sitemap.xml",
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      },
    );
  }

  const [posts, tags] = await Promise.all([getFormattedDatabase(), getAllTags()]);

  const nowIso = new Date().toISOString();

  const staticUrls = [
    { loc: `${siteUrl}/`, lastmod: nowIso },
    { loc: `${siteUrl}/posts`, lastmod: nowIso },
  ];

  const postUrls = posts.map((post) => ({
    loc: `${siteUrl}/posts/${encodeURIComponent(post.slug)}`,
    lastmod: post.updatedAt || post.date || nowIso,
  }));

  const tagUrls = tags.map((tag) => ({
    loc: `${siteUrl}/tags/${encodeURIComponent(tag)}`,
    lastmod: nowIso,
  }));

  const allUrls = [...staticUrls, ...postUrls, ...tagUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${escapeXml(entry.lastmod)}</lastmod>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
