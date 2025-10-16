import { defineMiddleware } from "astro:middleware";
import { createClient } from "@supabase/supabase-js";
import { Buffer } from "node:buffer";

import type { SupabaseClient } from "../db/supabase.client";
import type { Database } from "../db/database.types";

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL) {
  throw new Error("PUBLIC_SUPABASE_URL is not defined.");
}

if (!SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("PUBLIC_SUPABASE_PUBLISHABLE_KEY is not defined.");
}

export const onRequest = defineMiddleware(async (context, next) => {
  const authHeader = context.request.headers.get("Authorization") ?? undefined;
  const globalHeaders: Record<string, string> = {};

  if (authHeader) {
    globalHeaders.Authorization = authHeader;
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: globalHeaders },
  }) as SupabaseClient;

  let session: App.Locals["session"] = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();

    const { data, error } = await supabase.auth.getUser(token);

    if (!error && data.user) {
      const { expiresAt, expiresIn } = inferTokenExpiry(token);

      session = {
        access_token: token,
        token_type: "bearer",
        refresh_token: "",
        expires_at: expiresAt ?? undefined,
        expires_in: expiresIn,
        user: data.user,
      };
    }
  }

  context.locals.supabase = supabase;
  context.locals.session = session;

  return next();
});

function inferTokenExpiry(token: string): { expiresAt: number | null; expiresIn: number } {
  const payload = token.split(".")[1];

  if (!payload) {
    return { expiresAt: null, expiresIn: 0 };
  }

  try {
    const buffer = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const decoded = JSON.parse(buffer.toString()) as { exp?: number };

    if (typeof decoded.exp !== "number") {
      return { expiresAt: null, expiresIn: 0 };
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const expiresIn = Math.max(0, decoded.exp - nowInSeconds);

    return { expiresAt: decoded.exp, expiresIn };
  } catch {
    return { expiresAt: null, expiresIn: 0 };
  }
}
