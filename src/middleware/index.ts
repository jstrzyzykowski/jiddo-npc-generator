import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "../lib/supabase";

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createSupabaseServerClient(context.cookies);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  context.locals.supabase = supabase;
  context.locals.session = session;

  const pathname = context.url.pathname;

  // Redirect authenticated users away from the login page
  if (session && pathname === "/login") {
    return context.redirect("/", 302);
  }

  if (!isNonPagePath(pathname)) {
    const match = matchRoutePolicy(pathname);
    if (match) {
      if (match.access === "protected" && !session) {
        return context.redirect("/", 302);
      }

      if (session && match.ownerParam) {
        const me = session.user?.id ?? null;
        const claimed = match.params[match.ownerParam];
        if (me && claimed && me !== claimed) {
          return context.redirect(`/profile/${me}`, 302);
        }
      }
    }
  }

  return next();
});

// Local route policy utils (avoid separate file to keep line-endings consistent)
interface RoutePolicyDef {
  template: string;
  access: "public" | "protected";
  ownerParam?: string;
}

interface CompiledRoutePolicy extends RoutePolicyDef {
  regex: RegExp;
  keys: string[];
}

const ROUTE_POLICY_DEFS: RoutePolicyDef[] = [
  { template: "/", access: "public" },
  { template: "/login", access: "public" },
  { template: "/auth/callback", access: "public" },
  { template: "/npcs", access: "public" },
  { template: "/npcs/:npcId", access: "public" },
  { template: "/creator", access: "protected" },
  { template: "/creator/:npcId", access: "protected" },
  { template: "/profile/:userId", access: "protected", ownerParam: "userId" },
];

function escapeRegex(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compilePattern(template: string): { regex: RegExp; keys: string[] } {
  const segments = template.split("/").filter((s) => s.length > 0);
  const keys: string[] = [];
  const pattern = segments
    .map((seg) => {
      if (seg.startsWith(":")) {
        const key = seg.slice(1);
        keys.push(key);
        return "([^/]+)";
      }
      return escapeRegex(seg);
    })
    .join("/");

  const source = `^/${pattern}$`;
  return { regex: new RegExp(source), keys };
}

const ROUTE_POLICIES: CompiledRoutePolicy[] = ROUTE_POLICY_DEFS.map((def) => {
  const compiled = compilePattern(def.template);
  return { ...def, ...compiled };
});

function matchRoutePolicy(
  pathname: string
): { access: "public" | "protected"; ownerParam?: string; params: Record<string, string> } | null {
  for (const policy of ROUTE_POLICIES) {
    const match = policy.regex.exec(pathname);
    if (match) {
      const params: Record<string, string> = {};
      policy.keys.forEach((key, index) => {
        const value = match[index + 1];
        if (typeof value === "string") {
          params[key] = value;
        }
      });
      return { access: policy.access, ownerParam: policy.ownerParam, params };
    }
  }
  return null;
}

function isNonPagePath(pathname: string): boolean {
  return pathname.startsWith("/api/") || pathname.startsWith("/assets/") || pathname.startsWith("/public/");
}
