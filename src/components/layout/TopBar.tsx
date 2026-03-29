import { useNavigate, useLocation } from "react-router-dom";
import { Heart, Home } from "lucide-react";
import { useGroup } from "@/hooks/useGroup";
import { cn } from "@/lib/utils";

interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps) {
  const { group } = useGroup();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const inGroup = pathname.startsWith("/group/") || pathname.startsWith("/add") || pathname.startsWith("/edit/") || pathname.startsWith("/expenses") || pathname.startsWith("/members") || pathname.startsWith("/settings");

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex items-center justify-between",
        "border-b border-border bg-background/80 px-4 py-3 backdrop-blur-lg",
        className,
      )}
    >
      {/* Left: Home button + group name */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/")}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-card"
          aria-label="Home"
        >
          <Home className="h-5 w-5 text-muted-foreground" />
        </button>

        {inGroup && group ? (
          <button
            onClick={() => navigate(`/group/${group.id}`)}
            className="text-lg font-semibold tracking-tight text-foreground hover:text-primary transition-colors"
          >
            {group.name}
          </button>
        ) : (
          <span className="text-lg font-semibold tracking-tight text-foreground">
            L&L
          </span>
        )}
      </div>

      <Heart
        className="h-5 w-5 fill-primary text-primary"
        strokeWidth={2}
        aria-hidden="true"
      />
    </header>
  );
}
