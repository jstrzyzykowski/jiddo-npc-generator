import type { PropsWithChildren, ReactNode } from "react";

interface ProfileLayoutProps extends PropsWithChildren {
  aside: ReactNode;
}

export function ProfileLayout({ aside, children }: ProfileLayoutProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 py-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <aside>
          <div className="flex h-full max-h-[calc(100vh-18rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-4 shadow-sm">
            {aside}
          </div>
        </aside>

        <main className="relative">{children}</main>
      </div>
    </div>
  );
}
