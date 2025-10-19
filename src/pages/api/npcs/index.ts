import type { APIRoute } from "astro";
import { ZodError, type typeToFlattenedError } from "zod";

import { NpcService, NpcServiceError } from "../../../lib/services/npcService";
import {
  parseGetNpcListQueryParams,
  createNpcCommandSchema,
  parseCreateNpcCommand,
  type CreateNpcCommandInput,
  type GetNpcListQueryInput,
} from "../../../lib/validators/npcValidators";

type ValidationErrors = typeToFlattenedError<CreateNpcCommandInput, string>;
type QueryValidationErrors = typeToFlattenedError<GetNpcListQueryInput, string>;

export const prerender = false;

const JSON_HEADERS: HeadersInit = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export const GET: APIRoute = async ({ locals, request }) => {
  const supabase = locals.supabase;

  if (!supabase) {
    return createErrorResponse("SUPABASE_NOT_INITIALIZED", { context: "GET /npcs" });
  }

  let query;

  try {
    const url = new URL(request.url);
    query = parseGetNpcListQueryParams(url.searchParams);
  } catch (error) {
    if (error instanceof ZodError) {
      return createQueryValidationErrorResponse(error.flatten());
    }

    return createErrorResponse("INVALID_QUERY_PARAMETERS", {
      cause: error,
      context: "GET /npcs",
    });
  }

  const session = locals.session;
  const userId = session?.user?.id ?? null;

  if ((query.visibility === "mine" || query.visibility === "all") && !userId) {
    return createErrorResponse("UNAUTHORIZED", { context: "GET /npcs" });
  }

  const npcService = new NpcService(supabase);

  try {
    const result = await npcService.getNpcList(query, userId);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    if (error instanceof NpcServiceError && error.code in ERROR_DETAILS) {
      return createErrorResponse(error.code as ErrorCode, {
        cause: error,
        context: "GET /npcs",
      });
    }

    return createErrorResponse("INTERNAL_SERVER_ERROR", {
      cause: error,
      context: "GET /npcs",
    });
  }
};

type ErrorCode =
  | "SUPABASE_NOT_INITIALIZED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_PAYLOAD"
  | "INVALID_QUERY_PARAMETERS"
  | "DUPLICATE_REQUEST"
  | "NPC_INSERT_FAILED"
  | "NPC_FETCH_FAILED"
  | "NPC_ACCESS_FORBIDDEN"
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
    message: "You are not allowed to perform this action.",
  },
  INVALID_PAYLOAD: {
    status: 400,
    message: "Request body is invalid.",
  },
  INVALID_QUERY_PARAMETERS: {
    status: 400,
    message: "Query parameters are invalid.",
  },
  DUPLICATE_REQUEST: {
    status: 400,
    message: "This request was already processed.",
  },
  NPC_INSERT_FAILED: {
    status: 500,
    message: "Unable to create NPC.",
  },
  NPC_FETCH_FAILED: {
    status: 500,
    message: "Unable to verify NPC status.",
  },
  NPC_ACCESS_FORBIDDEN: {
    status: 403,
    message: "You do not have access to this resource.",
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    message: "An unexpected error occurred.",
  },
};

export const POST: APIRoute = async ({ locals, request }) => {
  const supabase = locals.supabase;
  const session = locals.session;

  if (!supabase) {
    return createErrorResponse("SUPABASE_NOT_INITIALIZED", { context: "POST /npcs" });
  }

  if (!session) {
    return createErrorResponse("UNAUTHORIZED", { context: "POST /npcs" });
  }

  const user = session.user;

  let payload: CreateNpcCommandInput;

  try {
    payload = (await request.json()) as CreateNpcCommandInput;
  } catch (error) {
    return createErrorResponse("INVALID_PAYLOAD", { cause: error, context: "POST /npcs" });
  }

  const validationResult = createNpcCommandSchema.safeParse(payload);
  if (!validationResult.success) {
    return createValidationErrorResponse(validationResult.error.flatten());
  }

  const command = parseCreateNpcCommand(payload);
  const npcService = new NpcService(supabase);

  try {
    const result = await npcService.createNpc(command, user.id);

    return new Response(
      JSON.stringify({
        id: result.npc.id,
        status: result.npc.status,
        ownerId: result.npc.owner_id,
        createdAt: result.npc.created_at,
        updatedAt: result.npc.updated_at,
      }),
      {
        status: result.created ? 201 : 200,
        headers: JSON_HEADERS,
      }
    );
  } catch (error) {
    if (error instanceof NpcServiceError) {
      if (error.code in ERROR_DETAILS) {
        return createErrorResponse(error.code as ErrorCode, {
          cause: error,
          context: "POST /npcs",
        });
      }
    }

    return createErrorResponse("INTERNAL_SERVER_ERROR", { cause: error, context: "POST /npcs" });
  }
};

function createErrorResponse(
  code: ErrorCode,
  options?: { cause?: unknown; details?: unknown; context?: string }
): Response {
  const { status, message } = ERROR_DETAILS[code];
  const logContext = options?.context ?? "POST /npcs";

  if (options?.cause) {
    console.error(`${logContext} ${code}`, options.cause);
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

function createValidationErrorResponse(error: ValidationErrors): Response {
  console.error("POST /npcs validation", error);

  return createErrorResponse("INVALID_PAYLOAD", {
    details: {
      fieldErrors: error.fieldErrors,
      formErrors: error.formErrors,
    },
    context: "POST /npcs",
  });
}

function createQueryValidationErrorResponse(error: QueryValidationErrors): Response {
  console.error("GET /npcs validation", error);

  return createErrorResponse("INVALID_QUERY_PARAMETERS", {
    details: {
      fieldErrors: error.fieldErrors,
      formErrors: error.formErrors,
    },
    context: "GET /npcs",
  });
}
