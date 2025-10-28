import { useState } from "react";
import { LogIn, Menu, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { useAuth } from "../auth/useAuth";
import { ThemeToggle } from "./ThemeToggle";

interface MobileNavProps {
  className?: string;
}

export function MobileNav({ className }: MobileNavProps) {
  const { user, isLoading } = useAuth();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);

  const handleNavigate = () => setMenuOpen(false);

  return (
    <div className={cn("flex items-center gap-2 md:hidden", className)}>
      {isSearchOpen && (
        <div className="absolute inset-x-0 top-full z-40 bg-background px-4 pb-4 pt-2 shadow-md">
          <Input placeholder="Search NPCs" aria-label="Search NPCs" />
        </div>
      )}

      <Button size="icon" variant="ghost" onClick={() => setSearchOpen((prev) => !prev)}>
        <Search className="size-5" />
        <span className="sr-only">Toggle search</span>
      </Button>

      <Sheet open={isMenuOpen} onOpenChange={setMenuOpen} modal={false}>
        <SheetTrigger asChild>
          <Button size="icon" variant="ghost">
            <Menu className="size-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="gap-0 p-0">
          <SheetHeader className="border-b px-6 py-4 text-left">
            <p className="text-lg font-semibold">Menu</p>
          </SheetHeader>
          <div className="flex flex-col gap-3 px-6 py-4">
            <Button
              asChild
              size="lg"
              disabled={!user || isLoading}
              className="justify-start"
              variant={user ? "default" : "secondary"}
              onClick={handleNavigate}
            >
              <a href="/creator">Create NPC</a>
            </Button>

            {user ? (
              <Button asChild variant="ghost" className="justify-start" onClick={handleNavigate}>
                <a href={`/profile/${user.id}`}>Your Profile</a>
              </Button>
            ) : (
              <Button asChild variant="ghost" className="justify-start" onClick={handleNavigate}>
                <a href="/login">
                  <LogIn className="mr-2 size-4" />
                  Sign In
                </a>
              </Button>
            )}
          </div>
          <SheetFooter className="border-t px-6 py-4">
            <ThemeToggle label="Dark mode" className="w-full justify-between" />
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
