import { Bot } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { useAuth } from "../../auth/useAuth";
import { HomeHeader } from "./HomeHeader";
import { NpcPlaceholderCard } from "./NpcPlaceholderCard";

const FEATURED_PLACEHOLDERS = Array.from({ length: 6 });

function FeaturedInfoPanel() {
  return (
    <Card className="col-span-full flex flex-col justify-center bg-transparent border-none shadow-none lg:col-span-2">
      <CardHeader className="px-0">
        <div className="flex items-center gap-4">
          <div className="flex shrink-0 size-12 items-center justify-center rounded-lg bg-muted">
            <Bot className="size-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Discover Featured NPCs</CardTitle>
        </div>
        <CardDescription className="max-w-[500px] pt-2">
          Explore curated NPCs hand-picked by the community team. Check out traders, quest givers, and powerful bosses
          ready to drop into your world.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Button asChild size="sm">
          <a href="/npcs">Explore all NPCs</a>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-10">
      {user ? <HomeHeader /> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {user ? null : <FeaturedInfoPanel />}
        {FEATURED_PLACEHOLDERS.map((_, index) => (
          <NpcPlaceholderCard key={index} />
        ))}
      </div>
    </div>
  );
}
