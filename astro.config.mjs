// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ["node:buffer", "node:crypto"],
    },
  },
  adapter: cloudflare(),
  devToolbar: {
    enabled: false,
  },
  env: {
    schema: {
      PUBLIC_SUPABASE_URL: envField.string({ context: "client", access: "public" }),
      PUBLIC_SUPABASE_PUBLISHABLE_KEY: envField.string({ context: "client", access: "public" }),
      PUBLIC_ENV_NAME: envField.string({ context: "client", access: "public" }),

      SUPABASE_SECRET_KEY: envField.string({ context: "server", access: "secret" }),
      OPENROUTER_API_KEY: envField.string({ context: "server", access: "secret" }),

      APP_URL: envField.string({ context: "server", access: "public" }),
      APP_TITLE: envField.string({ context: "server", access: "public" }),
    },
  },
});
