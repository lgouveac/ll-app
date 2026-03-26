import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Heart, Plus, Check } from "lucide-react";
import { useGroup } from "@/hooks/useGroup";
import { cn } from "@/lib/utils";

interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps) {
  const { group, groups, setActiveGroup } = useGroup();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex items-center justify-between",
        "border-b border-border bg-background/80 px-4 py-3 backdrop-blur-lg",
        className,
      )}
    >
      {/* Group selector */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg px-1 py-0.5 transition-colors hover:bg-card"
        >
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            {group?.name ?? "L&L"}
          </h1>
          {groups.length > 1 && (
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl">
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setActiveGroup(g.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    g.id === group?.id
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <span className="flex-1 text-left font-medium">{g.name}</span>
                  {g.id === group?.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/setup");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
                <span className="font-medium">Novo grupo</span>
              </button>
            </div>
          </>
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
