import { createRootPage } from "@/components/AppShell";

import type { NpcDetailPageProps } from "./NpcDetailPage";
import NpcDetailPage from "./NpcDetailPage";

export const NpcDetailApp = createRootPage<NpcDetailPageProps>(NpcDetailPage);
