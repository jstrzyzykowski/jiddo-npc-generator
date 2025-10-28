import { LogOut, User } from "lucide-react";

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { useAuth } from "../auth/useAuth";
import { ThemeToggle } from "./ThemeToggle";

interface UserDropdownProps {
  className?: string;
  onLogout?: () => void;
}

export function UserDropdown({ className, onLogout }: UserDropdownProps) {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    onLogout?.();
  };

  return (
    <DropdownMenuContent align="end" sideOffset={8} className={cn("min-w-[220px]", className)}>
      <DropdownMenuLabel className="flex flex-col">
        <span className="text-sm font-semibold">{user.displayName}</span>
        <span className="text-xs text-muted-foreground">Logged in</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <a href={`/profile/${user.id}`} className="flex items-center gap-2">
          <User className="size-4" />
          Your Profile
        </a>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <div className="px-2 py-1.5">
        <ThemeToggle label="Dark mode" className="w-full justify-between" />
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={handleLogout}>
        <LogOut className="size-4" />
        Sign Out
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
