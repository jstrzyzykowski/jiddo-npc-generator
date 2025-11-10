import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { AstroCookies } from "astro";

export const createSupabaseServerClient = (cookies: AstroCookies, supabaseUrl: string, supabaseKey: string) => {
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(key: string) {
        return cookies.get(key)?.value;
      },
      set(key: string, value: string, options: CookieOptions) {
        cookies.set(key, value, options);
      },
      remove(key: string, options: CookieOptions) {
        cookies.delete(key, options);
      },
    },
  });
};
