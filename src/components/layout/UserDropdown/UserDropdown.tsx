import { LogOut, User } from "lucide-react";

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useAuth } from "../../auth/useAuth";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";

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
    window.location.href = "/";
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
      <div className="flex items-center gap-2 px-1 py-1">
        <ThemeToggle className="flex-1 d-flex items-center justify-center" />
        <Button
          className="flex-1"
          type="button"
          variant="secondary"
          size="icon"
          onClick={handleLogout}
          aria-label="Sign out"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </DropdownMenuContent>
  );
}
