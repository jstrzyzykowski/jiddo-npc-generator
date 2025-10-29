import { useEffect, useRef, useState } from "react";

import type { Session } from "@supabase/supabase-js";

import { supabaseClient } from "@/db/supabase.client";

export type AuthState = "loading" | "success" | "error";

export interface AuthErrorViewModel {
  title: string;
  message: string;
}

interface UseAuthCallbackResult {
  status: AuthState;
  error: AuthErrorViewModel | null;
}

const NETWORK_TIMEOUT_MS = 10_000;

type ErrorKind = "invalidLink" | "network" | "unknown";

const ERROR_CONTENT: Record<ErrorKind, AuthErrorViewModel> = {
  invalidLink: {
    title: "Nie udało się zalogować",
    message: "Link logowania wygasł lub jest nieprawidłowy.",
  },
  network: {
    title: "Problem z połączeniem",
    message: "Wystąpił problem z połączeniem. Sprawdź swoją sieć i spróbuj ponownie.",
  },
  unknown: {
    title: "Nieoczekiwany błąd",
    message: "Wystąpił nieoczekiwany błąd podczas logowania. Spróbuj ponownie.",
  },
};

export function useAuthCallback(): UseAuthCallbackResult {
  const [status, setStatus] = useState<AuthState>("loading");
  const [error, setError] = useState<AuthErrorViewModel | null>(null);
  const hasFinishedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let isActive = true;

    const urlError = readErrorFromUrl();
    if (urlError) {
      fail(urlError);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      fail(ERROR_CONTENT.network);
    }, NETWORK_TIMEOUT_MS);

    const { data: listener } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (!isActive) {
        return;
      }

      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        handleSessionSuccess(session, timeoutId);
        return;
      }

      if (event === "USER_UPDATED" && session) {
        handleSessionSuccess(session, timeoutId);
      }
    });

    supabaseClient.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!isActive) {
          return;
        }

        if (sessionError) {
          clearTimeout(timeoutId);
          fail(ERROR_CONTENT.unknown);
          return;
        }

        if (data.session) {
          handleSessionSuccess(data.session, timeoutId);
        }
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        clearTimeout(timeoutId);
        fail(ERROR_CONTENT.unknown);
      });

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
      listener?.subscription.unsubscribe();
    };
  }, []);

  return { status, error };

  function handleSessionSuccess(session: Session | null, timeoutId: number) {
    if (!session || hasFinishedRef.current) {
      return;
    }

    window.clearTimeout(timeoutId);
    hasFinishedRef.current = true;
    stripAuthFragments();
    setError(null);
    setStatus("success");
  }

  function fail(viewModel: AuthErrorViewModel) {
    if (hasFinishedRef.current) {
      return;
    }

    hasFinishedRef.current = true;
    setStatus("error");
    setError(viewModel);
  }
}

function readErrorFromUrl(): AuthErrorViewModel | null {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  const searchParams = url.searchParams;

  const errorDescription = hashParams.get("error_description") ?? searchParams.get("error_description");
  const errorCode = hashParams.get("error") ?? searchParams.get("error");

  if (!errorDescription && !errorCode) {
    return null;
  }

  void sanitizeUrl(url);

  if (errorCode && errorCode.toLowerCase().includes("expired")) {
    return ERROR_CONTENT.invalidLink;
  }

  if (errorDescription) {
    const normalized = errorDescription.toLowerCase();
    if (normalized.includes("expired") || normalized.includes("invalid")) {
      return ERROR_CONTENT.invalidLink;
    }
  }

  return ERROR_CONTENT.unknown;
}

function sanitizeUrl(url: URL) {
  url.hash = "";
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");

  window.history.replaceState({}, document.title, url.toString());
}

function stripAuthFragments() {
  if (!window.location.hash) {
    return;
  }

  const url = new URL(window.location.href);
  if (!url.hash) {
    return;
  }

  url.hash = "";
  window.history.replaceState({}, document.title, url.toString());
}
