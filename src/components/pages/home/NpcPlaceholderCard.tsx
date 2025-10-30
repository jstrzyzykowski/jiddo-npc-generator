import npcPlaceholder from "@/assets/images/1.png";

import { Card, CardTitle } from "@/components/ui/card";

interface NpcPlaceholderCardProps {
  label?: string;
}

export function NpcPlaceholderCard({ label = "Upcoming NPC" }: NpcPlaceholderCardProps) {
  return (
    <Card className="group flex h-full min-h-[392px] flex-col items-center justify-center border border-dashed border-muted-foreground/30 bg-muted/10 transition-colors duration-200 hover:bg-muted/20">
      <img
        src={npcPlaceholder.src}
        alt="Upcoming NPC placeholder"
        loading="lazy"
        className="h-20 w-20 object-contain opacity-40 transition-opacity duration-200 group-hover:opacity-60"
      />
      <CardTitle className="text-sm font-semibold text-muted-foreground opacity-70 transition-opacity duration-200 group-hover:opacity-90">
        {label}
      </CardTitle>
    </Card>
  );
}
