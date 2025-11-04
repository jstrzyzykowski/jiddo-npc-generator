import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

import { useAuth } from "../auth/useAuth";
import { CreateNpcButton } from "./CreateNpcButton";
import { GuestNav } from "./GuestNav";
import { LogoLink } from "./LogoLink";
import { MobileNav } from "./MobileNav";
import { UserNav } from "./UserNav";

interface TopbarProps {
  className?: string;
}

export function Topbar({ className }: TopbarProps) {
  const { user, isLoading } = useAuth();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75",
        className
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4">
        <LogoLink />

        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="hidden lg:flex flex-1 max-w-xl items-center rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            <Search className="mr-2 size-4" />
            Search (coming soon)
          </div>

          <CreateNpcButton className="hidden md:inline-flex" />

          {isLoading ? (
            <div className="size-9 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <UserNav />
          ) : (
            <GuestNav className="hidden md:flex" />
          )}

          <MobileNav className="md:hidden" />
        </div>
      </div>
    </header>
  );
}
