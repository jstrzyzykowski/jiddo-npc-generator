import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient as SupabaseJsClient } from "@supabase/supabase-js";
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from "astro:env/client";

import type { Database } from "./database.types";

export type SupabaseClient = SupabaseJsClient<Database>;

const supabaseUrl = PUBLIC_SUPABASE_URL;
const supabasePublishableKey = PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseClient = createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
