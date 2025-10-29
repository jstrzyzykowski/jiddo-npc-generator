import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "../lib/supabase";

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createSupabaseServerClient(context.cookies);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  context.locals.supabase = supabase;
  context.locals.session = session;

  if (session && context.url.pathname === "/login") {
    return context.redirect("/", 302);
  }

  return next();
});
