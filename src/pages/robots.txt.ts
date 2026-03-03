import type { APIRoute } from "astro";

export const GET: APIRoute = () => {
  const siteUrl = import.meta.env.PUBLIC_SITE_URL?.replace(/\/$/, "");

  const lines = ["User-agent: *", "Allow: /"];

  if (siteUrl) {
    lines.push(`Sitemap: ${siteUrl}/sitemap.xml`);
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
