import type { APIRoute } from "astro";
import { z } from "zod";

import { NpcService, NpcServiceError } from "../../../../lib/services/npcService";

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

const publishBodySchema = z
  .object({
    confirmed: z.literal(true, {
      errorMap: () => ({ message: "The publish action must be confirmed." }),
    }),
  })
  .strict();

type ErrorCode =
  | "SUPABASE_NOT_INITIALIZED"
  | "INVALID_PATH_PARAMETERS"
  | "INVALID_BODY"
  | "UNAUTHORIZED"
  | "NPC_NOT_FOUND"
  | "NPC_ACCESS_FORBIDDEN"
  | "NPC_ALREADY_PUBLISHED"
  | "NPC_PUBLISH_CONFLICT"
  | "NPC_PUBLISH_FAILED"
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
  NPC_ALREADY_PUBLISHED: {
    status: 409,
    message: "NPC is already published.",
  },
  NPC_PUBLISH_CONFLICT: {
    status: 422,
    message: "NPC does not meet the requirements for publication.",
  },
  NPC_PUBLISH_FAILED: {
    status: 500,
    message: "Unable to publish NPC due to an unexpected error.",
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    message: "An unexpected error occurred.",
  },
};

export const POST: APIRoute = async ({ locals, params, request }) => {
  const supabase = locals.supabase;
  const session = locals.session;

  if (!supabase) {
    return createErrorResponse("SUPABASE_NOT_INITIALIZED");
  }

  if (!session?.user?.id) {
    return createErrorResponse("UNAUTHORIZED");
  }

  const paramsValidation = pathParamsSchema.safeParse(params);
  if (!paramsValidation.success) {
    return createZodErrorResponse("INVALID_PATH_PARAMETERS", paramsValidation.error);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return createErrorResponse("INVALID_BODY", {
      details: {
        message: "Request body must be valid JSON.",
      },
      cause: error,
    });
  }

  const bodyValidation = publishBodySchema.safeParse(payload);
  if (!bodyValidation.success) {
    return createZodErrorResponse("INVALID_BODY", bodyValidation.error);
  }

  const npcService = new NpcService(supabase);

  try {
    const result = await npcService.publishNpc(paramsValidation.data.npcId, session.user.id);

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
    console.error("/api/npcs/:npcId/publish", code, options.cause);
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
