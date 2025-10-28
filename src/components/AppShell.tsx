import type { ComponentType, PropsWithChildren } from "react";

import { RootProvider } from "./RootProvider";

export interface AppShellProps {
  currentPath: string;
}

export function AppShell({ currentPath, children }: PropsWithChildren<AppShellProps>) {
  return <RootProvider currentPath={currentPath}>{children}</RootProvider>;
}

export function createRootPage<TProps extends AppShellProps>(PageComponent: ComponentType<TProps>) {
  return function RootPage(props: TProps) {
    return (
      <AppShell currentPath={props.currentPath}>
        <PageComponent {...props} />
      </AppShell>
    );
  };
}
