import type { APIRoute } from "astro";
import { z } from "zod";

import { NpcService, NpcServiceError } from "../../../../../lib/services/npcService";

export const prerender = false;

const JSON_HEADERS: HeadersInit = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const pathParamsSchema = z
  .object({
    npcId: z.string().uuid({ message: "npcId must be a valid UUID." }),
    jobId: z.string().uuid({ message: "jobId must be a valid UUID." }),
  })
  .strict();

type ErrorCode =
  | "SUPABASE_NOT_INITIALIZED"
  | "UNAUTHORIZED"
  | "INVALID_PATH_PARAMETERS"
  | "NPC_NOT_FOUND"
  | "NPC_ACCESS_FORBIDDEN"
  | "NPC_FETCH_FAILED"
  | "GENERATION_JOB_UPDATE_FAILED"
  | "XML_FETCH_FAILED"
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
  NPC_NOT_FOUND: {
    status: 404,
    message: "NPC could not be found.",
  },
  NPC_ACCESS_FORBIDDEN: {
    status: 404,
    message: "NPC could not be found.",
  },
  NPC_FETCH_FAILED: {
    status: 500,
    message: "Unable to fetch NPC details.",
  },
  GENERATION_JOB_UPDATE_FAILED: {
    status: 500,
    message: "Unable to process generation job due to an unexpected error.",
  },
  XML_FETCH_FAILED: {
    status: 500,
    message: "Unable to read generated XML content.",
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    message: "An unexpected error occurred.",
  },
};

export const GET: APIRoute = async ({ locals, params }) => {
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

  const { npcId, jobId } = paramsValidation.data;

  const npcService = new NpcService(supabase);

  try {
    const result = await npcService.getGenerationJobStatus(npcId, jobId, session.user.id);

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

function createErrorResponse(code: ErrorCode, options?: { details?: unknown; cause?: unknown }): Response {
  const { status, message } = ERROR_DETAILS[code];

  if (options?.cause) {
    console.error("/api/npcs/:npcId/generation-jobs/:jobId", code, options.cause);
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

function createZodErrorResponse(code: Extract<ErrorCode, "INVALID_PATH_PARAMETERS">, error: z.ZodError): Response {
  const flattened = error.flatten();

  return createErrorResponse(code, {
    details: {
      fieldErrors: flattened.fieldErrors,
      formErrors: flattened.formErrors,
    },
  });
}
