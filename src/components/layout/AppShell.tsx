import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <main
      className={cn(
        "relative min-h-dvh w-full overflow-y-auto bg-background pb-safe",
        className,
      )}
    >
      {children}
    </main>
  );
}
