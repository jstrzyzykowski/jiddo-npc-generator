import { useCallback, useEffect, useMemo, useState } from "react";

import defaultLuaTemplate from "@/assets/lua/default.lua?raw";
import { useAuth } from "@/components/auth/useAuth";
import type { NpcDetailViewModel, NpcMetadataViewModel } from "@/components/features/npc/detail/types";
import type { NpcDetailResponseDto, PublishNpcResponseDto } from "@/types/npc";
import { toast } from "sonner";

const COPY_SIZE_LIMIT_BYTES = 262_144; // 256 KB
const DEFAULT_REDIRECT_AFTER_DELETE = "/npcs";

interface UseNpcDetailState {
  npc: NpcDetailViewModel | null;
  isLoading: boolean;
  error: Error | null;
}

interface FetchNpcOptions {
  signal?: AbortSignal;
  silent?: boolean;
}

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
}

export function useNpcDetail(npcId: string) {
  const { user } = useAuth();
  const [state, setState] = useState<UseNpcDetailState>({ npc: null, isLoading: true, error: null });
  const [requestId, setRequestId] = useState(0);

  const currentUserId = user?.id ?? null;

  const mapToViewModel = useCallback(
    (dto: NpcDetailResponseDto): NpcDetailViewModel => {
      const isOwner = currentUserId === dto.owner.id;

      const metadata: NpcMetadataViewModel = {
        name: dto.name,
        author: dto.owner.displayName?.trim() || "Unknown creator",
        status: dto.status,
        createdAt: formatDateTime(dto.firstPublishedAt),
        updatedAt: formatDateTime(dto.publishedAt ?? dto.firstPublishedAt),
        publishedAt: dto.publishedAt ? formatDateTime(dto.publishedAt) : null,
        modules: buildModules(dto.modules),
      };

      const xmlSource = dto.xml ?? "";
      const luaSource = defaultLuaTemplate ?? dto.lua ?? "";

      return {
        metadata,
        code: {
          xml: xmlSource,
          lua: luaSource,
          isCopyDisabled: (dto.contentSizeBytes ?? 0) > COPY_SIZE_LIMIT_BYTES,
        },
        ownerActions: {
          id: dto.id,
          name: dto.name,
          status: dto.status,
        },
        isOwner,
      } satisfies NpcDetailViewModel;
    },
    [currentUserId]
  );

  const fetchNpc = useCallback(
    async ({ signal, silent = false }: FetchNpcOptions = {}) => {
      if (!npcId) {
        setState({ npc: null, isLoading: false, error: new Error("NPC identifier is required.") });
        return;
      }

      if (!silent) {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
      }

      try {
        const response = await fetch(`/api/npcs/${npcId}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal,
        });

        const payload = (await response.json().catch(() => null)) as NpcDetailResponseDto | ApiErrorResponse | null;

        if (!response.ok || !payload || isApiErrorResponse(payload)) {
          const message =
            (payload as ApiErrorResponse)?.error?.message ?? `Failed to load NPC details (${response.status}).`;
          throw new Error(message);
        }

        const dto = payload as NpcDetailResponseDto;

        if (signal?.aborted) {
          return;
        }

        setState({ npc: mapToViewModel(dto), isLoading: false, error: null });
      } catch (error) {
        if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }

        console.error("useNpcDetail.fetchNpc", error);
        setState({
          npc: null,
          isLoading: false,
          error: error instanceof Error ? error : new Error("Failed to load NPC details."),
        });
      }
    },
    [mapToViewModel, npcId]
  );

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const load = async () => {
      await fetchNpc({ signal: controller.signal });
    };

    if (isActive) {
      load();
    }

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [fetchNpc, requestId]);

  const publishNpc = useCallback(async () => {
    try {
      const response = await fetch(`/api/npcs/${npcId}/publish`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirmed: true }),
      });

      const payload = (await response.json().catch(() => null)) as PublishNpcResponseDto | ApiErrorResponse | null;

      if (!response.ok || !payload || isApiErrorResponse(payload)) {
        const message = (payload as ApiErrorResponse)?.error?.message ?? "Failed to publish NPC.";
        throw new Error(message);
      }

      const publishResult = payload as PublishNpcResponseDto;

      toast.success("NPC published successfully.");

      setState((prev) => {
        if (!prev.npc) {
          return prev;
        }

        const publishedAt = formatDateTime(publishResult.publishedAt);

        return {
          ...prev,
          npc: {
            ...prev.npc,
            metadata: {
              ...prev.npc.metadata,
              status: "published",
              updatedAt: publishedAt,
              publishedAt,
            },
            ownerActions: {
              ...prev.npc.ownerActions,
              status: "published",
            },
          },
        } satisfies UseNpcDetailState;
      });
    } catch (error) {
      console.error("useNpcDetail.publishNpc", error);
      const message = error instanceof Error ? error.message : "Failed to publish NPC.";
      toast.error(message);
    }
  }, [npcId]);

  const handleDeleteSuccess = useCallback(() => {
    setState({ npc: null, isLoading: false, error: null });

    if (typeof window !== "undefined") {
      window.location.href = DEFAULT_REDIRECT_AFTER_DELETE;
    }
  }, []);

  const copyToClipboard = useCallback(async (content: string) => {
    if (!content) {
      toast.error("Nothing to copy.");
      return;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = content;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      toast.success("Copied to clipboard.");
    } catch (error) {
      console.error("useNpcDetail.copyToClipboard", error);
      toast.error("Failed to copy content.");
    }
  }, []);

  const refresh = useCallback(() => {
    setRequestId((id) => id + 1);
  }, []);

  const isCopyDisabled = useMemo(() => state.npc?.code.isCopyDisabled ?? false, [state.npc?.code.isCopyDisabled]);

  return {
    npc: state.npc,
    isLoading: state.isLoading,
    error: state.error,
    publishNpc,
    handleDeleteSuccess,
    copyToClipboard,
    refresh,
    isCopyDisabled,
  } as const;
}

function buildModules(dto: NpcDetailResponseDto["modules"]): NpcDetailViewModel["metadata"]["modules"] {
  return [
    {
      id: "focus" as const,
      label: "Focus",
      isActive: Boolean(dto.focusEnabled),
    },
    {
      id: "travel" as const,
      label: "Travel",
      isActive: Boolean(dto.travelEnabled),
    },
    {
      id: "voice" as const,
      label: "Voice",
      isActive: Boolean(dto.voiceEnabled),
    },
    {
      id: "shop" as const,
      label: "Shop",
      isActive: Boolean(dto.shopEnabled),
    },
    {
      id: "keywords" as const,
      label: "Keywords",
      isActive: Boolean(dto.keywordsEnabled),
    },
  ];
}

function formatDateTime(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return "Not available";
  }

  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isApiErrorResponse(payload: unknown): payload is ApiErrorResponse {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return "error" in payload;
}
