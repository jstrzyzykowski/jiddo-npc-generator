import npcPlaceholder from "@/assets/images/1.png";

import { Card, CardTitle } from "@/components/ui/card";

export function NpcPlaceholderCard() {
  return (
    <Card className="group flex h-[260px] flex-col items-center justify-center rounded-lg border border-muted-foreground/20 bg-muted/10">
      <img
        src={npcPlaceholder.src}
        alt="Upcoming NPC placeholder"
        loading="lazy"
        className="h-20 w-20 object-contain opacity-40 transition-opacity duration-200 group-hover:opacity-70"
      />
      <CardTitle className="text-sm font-semibold opacity-40 transition-opacity duration-200 group-hover:opacity-70">
        Upcoming NPC
      </CardTitle>
    </Card>
  );
}
