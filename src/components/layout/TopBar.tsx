import { useNavigate, useLocation } from "react-router-dom";
import { Heart, Home } from "lucide-react";
import { useGroup } from "@/hooks/useGroup";
import { useAuth } from "@/hooks/useAuth";
import { cn, getInitials } from "@/lib/utils";

interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps) {
  const { group } = useGroup();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const inGroup = pathname.startsWith("/group/") || pathname.startsWith("/add") || pathname.startsWith("/edit/") || pathname.startsWith("/expenses") || pathname.startsWith("/members") || pathname.startsWith("/settings");

  const userName = user?.email?.split("@")[0] || "U";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex items-center justify-between",
        "border-b border-border bg-background/80 px-4 py-3 backdrop-blur-lg",
        className,
      )}
    >
      {/* Left: Home button + heart + name */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/")}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-card"
          aria-label="Home"
        >
          <Home className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="flex items-center gap-1.5">
          <Heart className="h-4 w-4 fill-primary text-primary" strokeWidth={2} />
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
      </div>

      {/* Right: User avatar → account */}
      <button
        onClick={() => navigate("/account")}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-xs font-bold transition-transform hover:scale-105"
        aria-label="Account"
      >
        {getInitials(userName)}
      </button>
    </header>
  );
}
