import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "../auth/useAuth";
import { UserDropdown } from "./UserDropdown/UserDropdown";
import { Button } from "../ui/button";

export function UserNav() {
  const { user } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative size-9 rounded-full">
          <Avatar className="size-9 cursor-pointer">
            <AvatarFallback>{user?.displayName?.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <UserDropdown />
    </DropdownMenu>
  );
}
