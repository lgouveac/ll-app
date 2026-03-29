import { useNavigate } from "react-router-dom";
import { Plus, Users, ChevronRight, Heart } from "lucide-react";
import { useGroup } from "@/hooks/useGroup";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";


export default function Home() {
  const navigate = useNavigate();
  const { groups, loading, setActiveGroup } = useGroup();
  const { user } = useAuth();
  const { t } = useI18n();

  const userName = user?.email?.split("@")[0] || "voce";

  function handleEnterGroup(groupId: string) {
    setActiveGroup(groupId);
    navigate(`/group/${groupId}`);
  }

  if (loading) {
    return (
      <div className="space-y-4 pt-6">
        <div className="animate-pulse h-5 w-32 rounded bg-muted" />
        <div className="animate-pulse h-7 w-48 rounded bg-muted" />
        <div className="space-y-3 pt-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-card h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">{t("home.greeting", { name: userName })}</p>
        <h1 className="text-2xl font-bold">{t("home.title")}</h1>
      </div>

      {/* Groups list */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-16 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full gradient-romantic-subtle">
            <Heart className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-lg font-bold mb-2">{t("home.empty.title")}</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {t("home.empty.description")}
          </p>
          <button
            onClick={() => navigate("/setup")}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#7C3AED] px-6 py-3 font-medium text-white"
          >
            <Plus className="h-5 w-5" />
            {t("home.createGroup")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => handleEnterGroup(group.id)}
              className={cn(
                "flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4",
                "text-left transition-all hover:border-primary/30 hover:bg-card/80 active:scale-[0.98]",
              )}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl gradient-romantic">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{group.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {group.default_currency}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
          ))}

          {/* New group button */}
          <button
            onClick={() => navigate("/setup")}
            className={cn(
              "flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-border p-4",
              "text-left transition-colors hover:border-primary/30",
            )}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <span className="font-medium text-muted-foreground">{t("home.newGroup")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
