import { useEffect, useMemo, useState } from "react";

import { supabaseClient } from "@/db/supabase.client";
import type { GetProfileMeResponseDto } from "@/types";

import { AuthContext } from "./AuthContext";
import type { AuthContextType, UserViewModel } from "./types";

const LOG_PREFIX = "AuthProvider";

interface AuthProviderProps {
  children: React.ReactNode;
}

interface AuthState {
  user: UserViewModel | null;
  isLoading: boolean;
  error: Error | null;
}

const INITIAL_STATE: AuthState = {
  user: null,
  isLoading: true,
  error: null,
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session) {
          fetchProfile();
        }
      } else if (event === "SIGNED_OUT") {
        setState({ user: null, isLoading: false, error: null });
      }
    });

    fetchProfile();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/profiles/me", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setState({ user: null, isLoading: false, error: null });
          return;
        }

        throw new Error(`Failed to fetch profile: ${response.status}`);
      }

      const profile = (await response.json()) as GetProfileMeResponseDto;

      setState({
        user: mapProfileToUser(profile),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error(`${LOG_PREFIX}: fetchProfile`, error);

      setState({ user: null, isLoading: false, error: error instanceof Error ? error : new Error("Unknown error") });
    }
  };
  const logout = async () => {
    try {
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        throw error;
      }

      setState({ user: null, isLoading: false, error: null });
    } catch (error) {
      console.error(`${LOG_PREFIX}: logout`, error);

      setState((prev) => ({ ...prev, error: error instanceof Error ? error : new Error("Logout failed") }));
    }
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user: state.user,
      isLoading: state.isLoading,
      error: state.error,
      logout,
    }),
    [state.error, state.isLoading, state.user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function mapProfileToUser(profile: GetProfileMeResponseDto): UserViewModel {
  return {
    id: profile.id,
    displayName: profile.displayName,
  } satisfies UserViewModel;
}
