import type { APIRoute } from "astro";
import { z } from "zod";

import { NpcService, NpcServiceError } from "../../../../lib/services/npcService";
import { parseBulkReplaceNpcKeywordsCommand } from "../../../../lib/validators/npcValidators";

export const prerender = false;

const JSON_HEADERS: HeadersInit = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const pathParamsSchema = z
  .object({
    npcId: z.string().uuid({ message: "npcId must be a valid UUID." }),
  })
  .strict();

type ErrorCode =
  | "SUPABASE_NOT_INITIALIZED"
  | "UNAUTHORIZED"
  | "INVALID_PATH_PARAMETERS"
  | "INVALID_BODY"
  | "NPC_NOT_FOUND"
  | "NPC_ACCESS_FORBIDDEN"
  | "NPC_KEYWORD_LIMIT_EXCEEDED"
  | "NPC_KEYWORD_CONFLICT"
  | "NPC_KEYWORD_REPLACE_FAILED"
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
  INVALID_PATH_PARAMETERS: {
    status: 400,
    message: "Path parameters are invalid.",
  },
  INVALID_BODY: {
    status: 400,
    message: "Request body is invalid.",
  },
  NPC_NOT_FOUND: {
    status: 404,
    message: "NPC could not be found.",
  },
  NPC_ACCESS_FORBIDDEN: {
    status: 404,
    message: "NPC could not be found.",
  },
  NPC_KEYWORD_LIMIT_EXCEEDED: {
    status: 409,
    message: "NPC keyword limit exceeded.",
  },
  NPC_KEYWORD_CONFLICT: {
    status: 409,
    message: "Keyword phrases must be unique per NPC.",
  },
  NPC_KEYWORD_REPLACE_FAILED: {
    status: 500,
    message: "Unable to update NPC keywords due to an unexpected error.",
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    message: "An unexpected error occurred.",
  },
};

export const PUT: APIRoute = async ({ locals, params, request }) => {
  const supabase = locals.supabase;
  const session = locals.session;

  if (!supabase) {
    return createErrorResponse("SUPABASE_NOT_INITIALIZED");
  }

  const paramsValidation = pathParamsSchema.safeParse(params);
  if (!paramsValidation.success) {
    return createZodErrorResponse("INVALID_PATH_PARAMETERS", paramsValidation.error);
  }

  const userId = session?.user?.id;
  if (!userId) {
    return createErrorResponse("UNAUTHORIZED");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return createErrorResponse("INVALID_BODY", {
      cause: error,
      details: { message: "Request body must be valid JSON." },
    });
  }

  let command;
  try {
    command = parseBulkReplaceNpcKeywordsCommand(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createZodErrorResponse("INVALID_BODY", error);
    }

    return createErrorResponse("INVALID_BODY", { cause: error });
  }

  const npcService = new NpcService(supabase);
  const { npcId } = paramsValidation.data;

  try {
    const keywords = await npcService.bulkReplaceNpcKeywords(npcId, userId, command);

    return new Response(
      JSON.stringify({
        items: keywords,
      }),
      {
        status: 200,
        headers: JSON_HEADERS,
      }
    );
  } catch (error) {
    if (error instanceof NpcServiceError && error.code in ERROR_DETAILS) {
      return createErrorResponse(error.code as ErrorCode, { cause: error });
    }

    return createErrorResponse("INTERNAL_SERVER_ERROR", { cause: error });
  }
};

function createErrorResponse(code: ErrorCode, options?: { details?: unknown; cause?: unknown }): Response {
  const { status, message } = ERROR_DETAILS[code];

  if (options?.cause) {
    console.error("/api/npcs/:npcId/keywords", code, options.cause);
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
  code: Extract<ErrorCode, "INVALID_PATH_PARAMETERS" | "INVALID_BODY">,
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
