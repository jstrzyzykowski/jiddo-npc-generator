import type { AppShellProps } from "@/components/AppShell";
import NpcDetailView from "@/components/features/npc/detail/NpcDetailView";

export interface NpcDetailPageProps extends AppShellProps {
  npcId: string;
}

export default function NpcDetailPage({ npcId }: NpcDetailPageProps) {
  return <NpcDetailView npcId={npcId} />;
}
