import type { APIRoute } from "astro";

import {
  getProfileWithNpcCounts,
  ProfileServiceError,
  updateProfileDisplayName,
} from "../../../lib/services/profileService";
import { z } from "zod";

export const prerender = false;

const JSON_HEADERS: HeadersInit = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

type ErrorCode =
  | "SUPABASE_NOT_INITIALIZED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "PROFILE_NOT_FOUND"
  | "PROFILE_FETCH_FAILED"
  | "NPC_COUNTS_FETCH_FAILED"
  | "PROFILE_ACCESS_FORBIDDEN"
  | "NPC_COUNTS_ACCESS_FORBIDDEN"
  | "INTERNAL_SERVER_ERROR";

const ERROR_DETAILS: Record<ErrorCode, { status: number; message: string }> = {
  SUPABASE_NOT_INITIALIZED: {
    status: 500,
    message: "Supabase client is not configured.",
  },
  UNAUTHORIZED: {
    status: 401,
    message: "Authentication required.",
  },
  FORBIDDEN: {
    status: 403,
    message: "You are not allowed to access this resource.",
  },
  PROFILE_NOT_FOUND: {
    status: 404,
    message: "Profile not found.",
  },
  PROFILE_FETCH_FAILED: {
    status: 500,
    message: "Unable to fetch profile data.",
  },
  NPC_COUNTS_FETCH_FAILED: {
    status: 500,
    message: "Unable to fetch NPC statistics.",
  },
  PROFILE_ACCESS_FORBIDDEN: {
    status: 403,
    message: "You do not have access to the requested profile.",
  },
  NPC_COUNTS_ACCESS_FORBIDDEN: {
    status: 403,
    message: "You do not have access to the NPC statistics.",
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    message: "An unexpected error occurred.",
  },
};

export const GET: APIRoute = async ({ locals }) => {
  const supabase = locals.supabase;

  if (!supabase) {
    return createErrorResponse("SUPABASE_NOT_INITIALIZED");
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return createErrorResponse("UNAUTHORIZED", { cause: error });
  }

  if (!user) {
    return createErrorResponse("UNAUTHORIZED");
  }

  try {
    const responseBody = await getProfileWithNpcCounts(supabase, user.id);

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    if (error instanceof ProfileServiceError) {
      if (error.code in ERROR_DETAILS) {
        return createErrorResponse(error.code as ErrorCode, { cause: error });
      }
    }

    return createErrorResponse("INTERNAL_SERVER_ERROR", { cause: error });
  }
};

const UpdateProfileBodySchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(50, "Display name too long"),
  bio: z.string().max(250, "Bio too long").optional(),
});

export const PATCH: APIRoute = async ({ locals, request }) => {
  const supabase = locals.supabase;

  if (!supabase) {
    return createErrorResponse("SUPABASE_NOT_INITIALIZED");
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return createErrorResponse("UNAUTHORIZED", { cause: error });
  }

  if (!user) {
    return createErrorResponse("UNAUTHORIZED");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: { code: "BAD_REQUEST", message: "Invalid JSON payload" } }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const parsed = UpdateProfileBodySchema.safeParse(payload);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
      }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  try {
    const updated = await updateProfileDisplayName(supabase, user.id, parsed.data.displayName);

    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    if (error instanceof ProfileServiceError) {
      if (error.code in ERROR_DETAILS) {
        return createErrorResponse(error.code as ErrorCode, { cause: error });
      }
    }

    return createErrorResponse("INTERNAL_SERVER_ERROR", { cause: error });
  }
};

function createErrorResponse(code: ErrorCode, options?: { cause?: unknown }): Response {
  const { status, message } = ERROR_DETAILS[code];

  if (options?.cause) {
    console.error(`GET /profiles/me ${code}`, options.cause);
  }

  return new Response(
    JSON.stringify({
      error: {
        code,
        message,
      },
    }),
    {
      status,
      headers: JSON_HEADERS,
    }
  );
}
