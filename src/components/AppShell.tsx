import type { ComponentType, PropsWithChildren } from "react";

import { RootProvider } from "./RootProvider";

export interface AppShellProps extends Record<string, unknown> {
  currentPath: string;
  pageProps?: Record<string, unknown>;
}

export function AppShell({ currentPath, pageProps, children }: PropsWithChildren<AppShellProps>) {
  return (
    <RootProvider currentPath={currentPath} pageProps={pageProps}>
      {children}
    </RootProvider>
  );
}

export function createRootPage<TProps extends AppShellProps>(PageComponent: ComponentType<TProps>) {
  return function RootPage(props: TProps) {
    return (
      <AppShell currentPath={props.currentPath} pageProps={props}>
        <PageComponent {...props} />
      </AppShell>
    );
  };
}
