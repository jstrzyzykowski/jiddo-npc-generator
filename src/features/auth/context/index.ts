import { createContext } from "react";

import type { AuthContextType } from "@/components/auth/types";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
