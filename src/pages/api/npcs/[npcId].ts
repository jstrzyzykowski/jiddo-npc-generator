import type { APIRoute } from "astro";
import { z } from "zod";

import { NpcService, NpcServiceError } from "../../../lib/services/npcService";
import { parseUpdateNpcCommand, validateDeleteNpcParams } from "../../../lib/validators/npcValidators";

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
  | "INVALID_BODY"
  | "UNAUTHORIZED"
  | "NPC_NOT_FOUND"
  | "NPC_ACCESS_FORBIDDEN"
  | "NPC_ALREADY_DELETED"
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
  INVALID_BODY: {
    status: 400,
    message: "Request body is invalid.",
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
  NPC_ALREADY_DELETED: {
    status: 409,
    message: "NPC was already deleted.",
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

export const PATCH: APIRoute = async ({ locals, params, request }) => {
  const supabase = locals.supabase;
  const session = locals.session;

  if (!supabase) {
    return createErrorResponse("SUPABASE_NOT_INITIALIZED");
  }

  if (!session?.user?.id) {
    return createErrorResponse("UNAUTHORIZED");
  }

  const paramsValidation = npcIdParamSchema.safeParse(params);
  if (!paramsValidation.success) {
    return createZodErrorResponse("INVALID_PATH_PARAMETERS", paramsValidation.error);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return createErrorResponse("INVALID_BODY", {
      cause: error,
      details: {
        message: "Request body must be valid JSON.",
      },
    });
  }

  const bodyValidation = parseUpdateNpcCommandSafe(payload);
  if (!bodyValidation.success) {
    return createZodErrorResponse("INVALID_BODY", bodyValidation.error);
  }

  const npcService = new NpcService(supabase);
  const { npcId } = paramsValidation.data;
  const command = bodyValidation.data;

  try {
    const result = await npcService.updateNpc(npcId, command, session.user.id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    if (error instanceof NpcServiceError && error.code in ERROR_DETAILS) {
      return createErrorResponse(error.code as ErrorCode, { cause: error });
    }

    return createErrorResponse("INTERNAL_SERVER_ERROR", { cause: error });
  }
};

export const DELETE: APIRoute = async ({ locals, params, request }) => {
  const supabase = locals.supabase;
  const session = locals.session;

  if (!supabase) {
    return createErrorResponse("SUPABASE_NOT_INITIALIZED");
  }

  if (!session?.user?.id) {
    return createErrorResponse("UNAUTHORIZED");
  }

  const url = new URL(request.url);
  const searchReason = url.searchParams.get("reason") ?? undefined;

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? null;
  let bodyReason: unknown = undefined;

  if (contentType && contentType.includes("application/json")) {
    let payload: unknown;

    try {
      payload = await request.json();
    } catch (error) {
      return createErrorResponse("INVALID_BODY", {
        cause: error,
        details: {
          message: "Request body must be valid JSON.",
        },
      });
    }

    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
      return createErrorResponse("INVALID_BODY", {
        details: {
          message: "Request body must be a JSON object.",
        },
      });
    }

    bodyReason = (payload as Record<string, unknown>).reason;
  }

  const validationResult = (() => {
    try {
      return {
        success: true,
        data: validateDeleteNpcParams({
          npcId: params.npcId,
          reason: bodyReason ?? searchReason,
        }),
      } as const;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error,
        } as const;
      }

      throw error;
    }
  })();

  if (!validationResult.success) {
    return createZodErrorResponse("INVALID_QUERY_PARAMETERS", validationResult.error);
  }

  const { npcId, reason: normalizedReason } = validationResult.data;
  const npcService = new NpcService(supabase);

  try {
    const result = await npcService.softDeleteNpc({
      npcId,
      userId: session.user.id,
      reason: normalizedReason,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    if (error instanceof NpcServiceError && error.code in ERROR_DETAILS) {
      return createErrorResponse(error.code as ErrorCode, { cause: error });
    }

    return createErrorResponse("INTERNAL_SERVER_ERROR", { cause: error });
  }
};

function parseUpdateNpcCommandSafe(
  payload: unknown
): { success: true; data: ReturnType<typeof parseUpdateNpcCommand> } | { success: false; error: z.ZodError } {
  try {
    const data = parseUpdateNpcCommand(payload);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }

    throw error;
  }
}

function createErrorResponse(code: ErrorCode, options?: { details?: unknown; cause?: unknown }): Response {
  const { status, message } = ERROR_DETAILS[code];

  if (options?.cause) {
    console.error(`/api/npcs/:npcId ${code}`, options.cause);
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
  code: Extract<ErrorCode, "INVALID_PATH_PARAMETERS" | "INVALID_QUERY_PARAMETERS" | "INVALID_BODY">,
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
