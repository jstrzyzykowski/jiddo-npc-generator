import { createRootPage } from "@/components/AppShell";

import NpcsPage, { type NpcsPageProps } from "./NpcsPage";

export const NpcsApp = createRootPage<NpcsPageProps>(NpcsPage);
