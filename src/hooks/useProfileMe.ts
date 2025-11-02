import { useCallback, useEffect, useRef, useState } from "react";

import type { GetProfileMeResponseDto } from "@/types";

interface UseProfileMeResult {
  profile: GetProfileMeResponseDto | null;
  isLoading: boolean;
  error: string | null;
  retry: () => Promise<void>;
}

const LOG_PREFIX = "useProfileMe";

export function useProfileMe(): UseProfileMeResult {
  const [profile, setProfile] = useState<GetProfileMeResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchProfile = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/profiles/me", {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 401) {
          setProfile(null);
          setIsLoading(false);
          setError(null);
          return;
        }

        throw new Error(`Failed to fetch profile: ${response.status}`);
      }

      const data = (await response.json()) as GetProfileMeResponseDto;
      setProfile(data);
      setIsLoading(false);
      setError(null);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        return;
      }

      console.error(`${LOG_PREFIX}: fetchProfile`, err);
      setProfile(null);
      setIsLoading(false);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    retry: fetchProfile,
  };
}
