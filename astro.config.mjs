// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import react from "@astrojs/react";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const siteUrl = process.env.PUBLIC_SITE_URL?.replace(/\/$/, "");

// https://astro.build/config
export default defineConfig({
  ...(siteUrl ? { site: siteUrl } : {}),
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
  },
  integrations: [react()],
});
