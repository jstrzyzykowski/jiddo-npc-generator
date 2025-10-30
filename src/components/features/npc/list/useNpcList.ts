import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createNpcListQuery } from "./config";
import { useNpcListContext } from "./NpcListProvider";
import type { GetNpcListResponseDto, NpcListItemDto } from "@/types";

export type NpcListStatus = "idle" | "loading" | "loading-more" | "success" | "error";

export interface UseNpcListOptions {
  initialData: GetNpcListResponseDto;
  initialError: string | null;
}

export interface UseNpcListResult {
  items: NpcListItemDto[];
  status: NpcListStatus;
  error: Error | null;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

interface InternalState {
  items: NpcListItemDto[];
  status: NpcListStatus;
  error: Error | null;
  nextCursor: string | null;
  hasMore: boolean;
}

export function useNpcList({ initialData, initialError }: UseNpcListOptions): UseNpcListResult {
  const { sort, filter } = useNpcListContext();
  const [state, setState] = useState<InternalState>(() => {
    if (initialError) {
      return {
        items: initialData.items ?? [],
        status: "error",
        error: new Error(initialError),
        nextCursor: initialData.pageInfo.nextCursor ?? null,
        hasMore: Boolean(initialData.pageInfo.nextCursor),
      } satisfies InternalState;
    }

    return {
      items: initialData.items ?? [],
      status: "success",
      error: null,
      nextCursor: initialData.pageInfo.nextCursor ?? null,
      hasMore: Boolean(initialData.pageInfo.nextCursor),
    } satisfies InternalState;
  });

  const didHydrateRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const buildSearchParams = useCallback(
    (overrides: Partial<{ cursor: string | null; limit: number | undefined }> = {}) => {
      const query = createNpcListQuery(sort, filter, {
        cursor: overrides.cursor ?? undefined,
        limit: overrides.limit,
      });

      const params = new URLSearchParams();

      Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }

        if (typeof value === "boolean") {
          params.set(key, value ? "true" : "false");
          return;
        }

        params.set(key, String(value));
      });

      return params;
    },
    [sort, filter]
  );

  const executeFetch = useCallback(
    async (mode: "replace" | "append", cursor?: string | null) => {
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setState((current) => {
        if (mode === "append") {
          if (current.status === "loading-more") {
            return current;
          }

          return {
            ...current,
            status: "loading-more",
            error: null,
          } satisfies InternalState;
        }

        return {
          ...current,
          status: "loading",
          error: null,
        } satisfies InternalState;
      });

      try {
        const params = buildSearchParams({ cursor });
        const url = `/api/npcs?${params.toString()}`;
        const response = await fetch(url, {
          method: "GET",
          signal: controller.signal,
        });

        if (!response.ok) {
          const message = await extractErrorMessage(response);
          throw new Error(message ?? `Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as GetNpcListResponseDto;

        setState((current) => mapSuccessState(current, payload, mode));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setState((current) => mapErrorState(current, error));
      }
    },
    [buildSearchParams]
  );

  useEffect(() => {
    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }

    executeFetch("replace");
  }, [executeFetch, sort.value, filter.value]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const refresh = useCallback(async () => {
    await executeFetch("replace");
  }, [executeFetch]);

  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.status === "loading" || state.status === "loading-more") {
      return;
    }

    await executeFetch("append", state.nextCursor);
  }, [executeFetch, state.hasMore, state.nextCursor, state.status]);

  const result = useMemo<UseNpcListResult>(() => {
    const { items, status, error, hasMore } = state;

    return {
      items,
      status,
      error,
      hasMore,
      isLoading: status === "loading",
      isLoadingMore: status === "loading-more",
      refresh,
      loadMore,
    } satisfies UseNpcListResult;
  }, [state, refresh, loadMore]);

  return result;
}

function mapSuccessState(
  current: InternalState,
  payload: GetNpcListResponseDto,
  mode: "replace" | "append"
): InternalState {
  const items = mode === "append" ? [...current.items, ...payload.items] : payload.items;
  const nextCursor = payload.pageInfo.nextCursor ?? null;

  return {
    items,
    status: "success",
    error: null,
    nextCursor,
    hasMore: Boolean(nextCursor),
  } satisfies InternalState;
}

function mapErrorState(current: InternalState, reason: unknown): InternalState {
  const error = reason instanceof Error ? reason : new Error("Nieoczekiwany błąd podczas pobierania listy NPC.");

  return {
    ...current,
    status: "error",
    error,
  } satisfies InternalState;
}

async function extractErrorMessage(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as { error?: { message?: string } };
    return data?.error?.message ?? null;
  } catch (error) {
    console.error("useNpcList extractErrorMessage", error);
    return null;
  }
}
