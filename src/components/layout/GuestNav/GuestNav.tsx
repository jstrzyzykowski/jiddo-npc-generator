import { LogIn, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { ThemeToggle } from "../ThemeToggle";

interface GuestNavProps {
  className?: string;
}

export function GuestNav({ className }: GuestNavProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button asChild size="sm" variant="ghost" className="gap-2">
        <a href="/login">
          <LogIn className="size-4" />
          Sign In
        </a>
      </Button>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost">
            <Menu className="size-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <a href="/login" className="flex items-center gap-2">
              <LogIn className="size-4" />
              Sign In
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="flex items-center gap-2 px-1 py-1">
            <ThemeToggle className="flex-1" />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
