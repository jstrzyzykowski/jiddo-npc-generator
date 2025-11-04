import type { GetProfileMeResponseDto } from "@/types/profile";

export interface UserViewModel {
  id: string;
  displayName: string;
}

export interface AuthContextType {
  user: UserViewModel | null;
  profile: GetProfileMeResponseDto | null;
  isLoading: boolean;
  error: Error | null;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}
