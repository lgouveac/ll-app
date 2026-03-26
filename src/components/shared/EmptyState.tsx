import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      <div className="gradient-romantic-subtle mb-4 flex h-16 w-16 items-center justify-center rounded-full">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>

      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {description}
      </p>

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
