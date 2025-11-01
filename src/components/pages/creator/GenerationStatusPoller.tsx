import { useEffect, useRef } from "react";

import type { GenerationJobStatusResponseDto } from "@/types";

const DEFAULT_INTERVAL_MS = 2500;

export interface GenerationStatusPollerProps {
  npcId: string;
  jobId: string;
  intervalMs?: number;
  onSuccess: (payload: GenerationJobStatusResponseDto) => void;
  onError: (error: unknown) => void;
}

export function GenerationStatusPoller({
  npcId,
  jobId,
  intervalMs = DEFAULT_INTERVAL_MS,
  onSuccess,
  onError,
}: GenerationStatusPollerProps) {
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!npcId || !jobId) {
      return;
    }

    let isCancelled = false;

    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const fetchStatus = async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(`/api/npcs/${npcId}/generation-jobs/${jobId}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => null)) as GenerationJobStatusResponseDto | null;

        if (!response.ok || !payload) {
          throw new Error(`Failed to fetch generation status (${response.status}).`);
        }

        if (isCancelled) {
          return;
        }

        onSuccess(payload);

        if (payload.status === "succeeded" || payload.status === "failed") {
          clearTimer();
        }
      } catch (pollError) {
        if (isAbortError(pollError)) {
          return;
        }

        clearTimer();
        onError(pollError);
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    };

    void fetchStatus();
    timerRef.current = window.setInterval(() => {
      void fetchStatus();
    }, intervalMs);

    return () => {
      isCancelled = true;
      clearTimer();
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [npcId, jobId, intervalMs, onSuccess, onError]);

  return null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
