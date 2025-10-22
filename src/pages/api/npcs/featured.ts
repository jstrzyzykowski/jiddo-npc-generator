import type { APIRoute } from "astro";

import type { GetFeaturedNpcsQueryDto } from "../../../types";
import { parseGetFeaturedNpcsQueryParams } from "../../../lib/validators/npcValidators";
import { NpcService, NpcServiceError } from "../../../lib/services/npcService";

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  let query: GetFeaturedNpcsQueryDto;

  try {
    query = parseGetFeaturedNpcsQueryParams(url.searchParams);
  } catch (error) {
    console.error("GET /api/npcs/featured validation", error);

    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters.",
          details: error instanceof Error ? error.message : undefined,
        },
      }),
      {
        status: 400,
        headers: {
          "content-type": "application/json",
        },
      }
    );
  }

  const supabase = locals.supabase;

  if (!supabase) {
    console.error("GET /api/npcs/featured missing Supabase client in locals");

    return new Response(
      JSON.stringify({
        error: {
          code: "SERVER_ERROR",
          message: "Service configuration error.",
        },
      }),
      {
        status: 500,
        headers: {
          "content-type": "application/json",
        },
      }
    );
  }

  const npcService = new NpcService(supabase);

  try {
    const response = await npcService.getFeaturedNpcs(query);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  } catch (error) {
    if (error instanceof NpcServiceError) {
      const status = mapNpcServiceErrorToStatus(error);

      return new Response(
        JSON.stringify({
          error: {
            code: error.code,
            message: mapNpcServiceErrorToMessage(error),
          },
        }),
        {
          status,
          headers: {
            "content-type": "application/json",
          },
        }
      );
    }

    console.error("GET /api/npcs/featured unexpected", error);

    return new Response(
      JSON.stringify({
        error: {
          code: "SERVER_ERROR",
          message: "Unexpected server error.",
        },
      }),
      {
        status: 500,
        headers: {
          "content-type": "application/json",
        },
      }
    );
  }
};

function mapNpcServiceErrorToStatus(error: NpcServiceError): number {
  switch (error.code) {
    case "NPC_ACCESS_FORBIDDEN":
      return 403;
    case "NPC_NOT_FOUND":
      return 404;
    default:
      return 500;
  }
}

function mapNpcServiceErrorToMessage(error: NpcServiceError): string {
  switch (error.code) {
    case "NPC_ACCESS_FORBIDDEN":
      return "Access to NPC resources is forbidden.";
    case "NPC_NOT_FOUND":
      return "Requested NPC was not found.";
    default:
      return "Failed to process NPC request.";
  }
}
