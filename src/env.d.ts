/// <reference types="astro/client" />

import type { SupabaseClient } from "./db/supabase.client";
import type { Session } from "@supabase/supabase-js";

declare namespace App {
  interface Locals {
    supabase: SupabaseClient;
    session: Session | null;
    runtime: import("@astrojs/cloudflare").Runtime<Env>;
  }
}
