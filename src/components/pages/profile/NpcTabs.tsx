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
        <TabsTrigger value="drafts">Drafts ({draftCount})</TabsTrigger>
        <TabsTrigger value="published">Published ({publishedCount})</TabsTrigger>
      </TabsList>
      <TabsContent value="drafts" />
      <TabsContent value="published" />
    </Tabs>
  );
}
