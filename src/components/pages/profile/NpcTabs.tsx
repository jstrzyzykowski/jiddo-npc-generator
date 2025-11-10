import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProfileNpcCountsDto } from "@/types/profile";

export type TabKey = "drafts" | "published";

interface NpcTabsProps {
  value: TabKey;
  counts?: ProfileNpcCountsDto | null;
  onValueChange: (value: TabKey) => void;
}

export function NpcTabs({ value, counts, onValueChange }: NpcTabsProps) {
  const draftCount = counts?.draft ?? 0;
  const publishedCount = counts?.published ?? 0;

  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as TabKey)}>
      <TabsList>
        <TabsTrigger value="drafts" className="gap-2">
          Drafts
          <Badge className="rounded-md bg-primary text-primary-foreground border-border/60 text-[11px]">
            {draftCount}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="published" className="gap-2">
          Published
          <Badge className="rounded-md bg-primary text-primary-foreground border-border/60 text-[11px]">
            {publishedCount}
          </Badge>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="drafts" />
      <TabsContent value="published" />
    </Tabs>
  );
}
