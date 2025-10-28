export interface UserViewModel {
  id: string;
  displayName: string;
}

export interface AuthContextType {
  user: UserViewModel | null;
  isLoading: boolean;
  error: Error | null;
  logout: () => Promise<void>;
}
