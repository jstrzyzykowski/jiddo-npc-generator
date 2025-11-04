import { useAuth } from "@/components/auth/useAuth";
import type { GetProfileMeResponseDto } from "@/types/profile";

interface UseProfileMeResult {
  profile: GetProfileMeResponseDto | null;
  isLoading: boolean;
  error: string | null;
  retry: () => Promise<void>;
}

export function useProfileMe(): UseProfileMeResult {
  const { profile, isLoading, error, refresh } = useAuth();

  return {
    profile,
    isLoading,
    error: error?.message ?? null,
    retry: refresh,
  };
}
