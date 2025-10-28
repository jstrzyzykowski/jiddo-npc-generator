import { useEffect, useMemo, useState } from "react";

import type { GetFeaturedNpcsResponseDto, NpcListItemDto } from "@/types";

import { useAuth } from "@/components/auth/useAuth";

interface UseFeaturedNpcsState {
  npcs: NpcListItemDto[] | null;
  isLoading: boolean;
  error: Error | null;
}

export function useFeaturedNpcs() {
  const { user } = useAuth();
  const [state, setState] = useState<UseFeaturedNpcsState>({ npcs: null, isLoading: true, error: null });
  const [requestId, setRequestId] = useState(0);

  const limit = useMemo(() => (user ? 8 : 6), [user]);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const load = async () => {
      setState({ npcs: null, isLoading: true, error: null });

      try {
        const response = await fetch(`/api/npcs/featured?limit=${limit}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load featured NPCs: ${response.status}`);
        }

        const payload = (await response.json()) as GetFeaturedNpcsResponseDto;

        if (!isActive) {
          return;
        }

        setState({ npcs: payload.items ?? [], isLoading: false, error: null });
      } catch (error) {
        if (!isActive || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }

        console.error("useFeaturedNpcs", error);
        setState({
          npcs: null,
          isLoading: false,
          error: error instanceof Error ? error : new Error("Unknown error"),
        });
      }
    };

    load();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [limit, requestId]);

  const retry = () => {
    setRequestId((id) => id + 1);
  };

  return {
    npcs: state.npcs,
    isLoading: state.isLoading,
    error: state.error,
    limit,
    isAuthenticated: Boolean(user),
    retry,
  };
}
