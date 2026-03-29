import { cn, formatCurrency } from "@/lib/utils";
import { t } from "@/i18n";

interface BudgetBarProps {
  spent: number;
  budget: number;
  currency: string;
  className?: string;
}

export default function BudgetBar({ spent, budget, currency, className }: BudgetBarProps) {
  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const remaining = Math.max(budget - spent, 0);
  const isOver = spent > budget;

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{t("budget.title")}</h3>
        <span className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-full",
          isOver ? "bg-destructive/20 text-destructive" : percentage > 80 ? "bg-warning/20 text-warning" : "bg-success/20 text-success"
        )}>
          {percentage.toFixed(0)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isOver ? "bg-destructive" : percentage > 80 ? "bg-warning" : "bg-success"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted-foreground">
          {t("budget.spent")} <span className="font-medium text-foreground">{formatCurrency(spent, currency)}</span>
        </span>
        <span className="text-xs text-muted-foreground">
          {isOver ? (
            <>{t("budget.exceeded")} <span className="font-medium text-destructive">{formatCurrency(spent - budget, currency)}</span></>
          ) : (
            <>{t("budget.remaining")} <span className="font-medium text-foreground">{formatCurrency(remaining, currency)}</span></>
          )}
        </span>
      </div>

      <p className="text-[10px] text-muted-foreground mt-1 text-center">
        {t("budget.limit")} {formatCurrency(budget, currency)}
      </p>
    </div>
  );
}
