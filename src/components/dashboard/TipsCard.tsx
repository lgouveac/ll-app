import { useState, useEffect } from "react";
import { Lightbulb, Tag, Percent, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import { getCachedTips, fetchAndCacheTips, type Tip } from "@/services/tipsService";
import type { Expense } from "@/types/expense";

interface TipsCardProps {
  groupId: string;
  groupType: string | null;
  currency: string;
  expenses?: Expense[];
  className?: string;
}

const typeIcons = {
  tip: Lightbulb,
  coupon: Tag,
  cashback: Percent,
};

const typeColors = {
  tip: "text-success bg-success/10",
  coupon: "text-primary bg-primary/10",
  cashback: "text-secondary bg-secondary/10",
};

export default function TipsCard({ groupId, groupType, currency, expenses: allExpenses, className }: TipsCardProps) {
  const { locale } = useI18n();
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!groupType || loaded) return;

    async function load() {
      try {
        const cached = await getCachedTips(groupId);
        if (cached && cached.length > 0) {
          setTips(cached);
          setLoaded(true);
          return;
        }
        // Auto-fetch on first load
        setLoading(true);
        const expenseData = (allExpenses || [])
          .filter((e) => e.category !== "transfer")
          .map((e) => ({
            amount: e.amount,
            converted_amount: e.converted_amount,
            category: e.category,
          }));
        const fresh = await fetchAndCacheTips(groupId, groupType!, currency, locale, expenseData);
        setTips(fresh);
        setLoaded(true);
      } catch (err) {
        console.error("Tips load error:", err);
        setLoaded(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [groupId, groupType, currency, locale, loaded]);

  async function handleRefresh() {
    if (!groupType || loading) return;
    setLoading(true);
    try {
      const expenseData = (allExpenses || []).map((e) => ({
        amount: e.amount,
        converted_amount: e.converted_amount,
        category: e.category,
      }));
      const fresh = await fetchAndCacheTips(groupId, groupType, currency, locale, expenseData);
      setTips(fresh);
    } catch (err) {
      console.error("Tips refresh error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!groupType) return null;
  if (!loaded && !loading) return null;

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-medium text-foreground">Dicas & Ofertas</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {loading && tips.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Buscando dicas...</p>
          </div>
        </div>
      ) : tips.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nenhuma dica encontrada.
        </p>
      ) : (
        <div className="space-y-2">
          {tips.slice(0, 5).map((tip, idx) => {
            const Icon = typeIcons[tip.type] || Lightbulb;
            const colors = typeColors[tip.type] || typeColors.tip;

            return (
              <div
                key={idx}
                className="flex gap-3 rounded-lg bg-background p-3"
              >
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", colors)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{tip.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tip.description}</p>
                  {tip.url && (
                    <a
                      href={tip.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-secondary hover:underline mt-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ver fonte
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
