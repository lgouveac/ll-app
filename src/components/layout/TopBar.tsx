import { Heart } from "lucide-react";
import { useGroup } from "@/hooks/useGroup";
import { cn } from "@/lib/utils";

interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps) {
  const { group } = useGroup();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex items-center justify-between",
        "border-b border-border bg-background/80 px-4 py-3 backdrop-blur-lg",
        className,
      )}
    >
      <h1 className="text-lg font-semibold tracking-tight text-foreground">
        {group?.name ?? "L&L"}
      </h1>

      <Heart
        className="h-5 w-5 fill-primary text-primary"
        strokeWidth={2}
        aria-hidden="true"
      />
    </header>
  );
}
