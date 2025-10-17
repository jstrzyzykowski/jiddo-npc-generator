import type { APIRoute } from "astro";
import { z } from "zod";

import { NpcService, NpcServiceError } from "../../../lib/services/npcService";

export const prerender = false;

const JSON_HEADERS: HeadersInit = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const npcIdParamSchema = z
  .object({
    npcId: z.string().uuid({ message: "npcId must be a valid UUID." }),
  })
  .strict();

const npcDetailQuerySchema = z
  .object({
    includeDraft: z
      .union([z.literal("true"), z.literal("false"), z.literal("1"), z.literal("0")])
      .optional()
      .transform((value) => {
        if (value === undefined) {
          return undefined;
        }

        return value === "true" || value === "1";
      }),
  })
  .strict();

type ErrorCode =
  | "SUPABASE_NOT_INITIALIZED"
  | "INVALID_PATH_PARAMETERS"
  | "INVALID_QUERY_PARAMETERS"
  | "UNAUTHORIZED"
  | "NPC_NOT_FOUND"
  | "NPC_ACCESS_FORBIDDEN"
  | "XML_NOT_FOUND"
  | "XML_FETCH_FAILED"
  | "LUA_READ_FAILED"
  | "INTERNAL_SERVER_ERROR";

const ERROR_DETAILS: Record<ErrorCode, { status: number; message: string }> = {
  SUPABASE_NOT_INITIALIZED: {
    status: 500,
    message: "Supabase client is not configured.",
  },
  INVALID_PATH_PARAMETERS: {
    status: 400,
    message: "Path parameters are invalid.",
  },
  INVALID_QUERY_PARAMETERS: {
    status: 400,
    message: "Query parameters are invalid.",
  },
  UNAUTHORIZED: {
    status: 401,
    message: "Authentication required.",
  },
  NPC_NOT_FOUND: {
    status: 404,
    message: "NPC could not be found.",
  },
  NPC_ACCESS_FORBIDDEN: {
    status: 404,
    message: "NPC could not be found.",
  },
  XML_NOT_FOUND: {
    status: 404,
    message: "NPC XML content is missing.",
  },
  XML_FETCH_FAILED: {
    status: 500,
    message: "Unable to download NPC XML content.",
  },
  LUA_READ_FAILED: {
    status: 500,
    message: "Unable to load LUA script template.",
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    message: "An unexpected error occurred.",
  },
};

export const GET: APIRoute = async ({ locals, params, request }) => {
  const supabase = locals.supabase;
  const session = locals.session;

  if (!supabase) {
    return createErrorResponse("SUPABASE_NOT_INITIALIZED");
  }

  const paramsValidation = npcIdParamSchema.safeParse(params);
  if (!paramsValidation.success) {
    return createZodErrorResponse("INVALID_PATH_PARAMETERS", paramsValidation.error);
  }

  const url = new URL(request.url);
  const queryValidation = npcDetailQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!queryValidation.success) {
    return createZodErrorResponse("INVALID_QUERY_PARAMETERS", queryValidation.error);
  }

  const { npcId } = paramsValidation.data;
  const { includeDraft = false } = queryValidation.data;

  if (includeDraft && !session) {
    return createErrorResponse("UNAUTHORIZED");
  }

  const npcService = new NpcService(supabase);
  const userId = session?.user?.id ?? null;

  try {
    const result = await npcService.getNpcDetails(npcId, userId, {
      includeDraft,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    if (error instanceof NpcServiceError) {
      if (error.code in ERROR_DETAILS) {
        return createErrorResponse(error.code as ErrorCode, { cause: error });
      }
    }

    return createErrorResponse("INTERNAL_SERVER_ERROR", { cause: error });
  }
};

function createErrorResponse(code: ErrorCode, options?: { details?: unknown; cause?: unknown }): Response {
  const { status, message } = ERROR_DETAILS[code];

  if (options?.cause) {
    console.error(`GET /npcs/:npcId ${code}`, options.cause);
  }

  return new Response(
    JSON.stringify({
      error: {
        code,
        message,
        details: options?.details,
      },
    }),
    {
      status,
      headers: JSON_HEADERS,
    }
  );
}

function createZodErrorResponse(
  code: Extract<ErrorCode, "INVALID_PATH_PARAMETERS" | "INVALID_QUERY_PARAMETERS">,
  error: z.ZodError
): Response {
  const flattened = error.flatten();

  return createErrorResponse(code, {
    details: {
      fieldErrors: flattened.fieldErrors,
      formErrors: flattened.formErrors,
    },
  });
}
