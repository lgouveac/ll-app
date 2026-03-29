import { useQuery } from "@tanstack/react-query";
import { useGroup } from "@/hooks/useGroup";
import { useI18n } from "@/hooks/useI18n";
import { getExpenses } from "@/services/expenseService";
import TipsCard from "@/components/dashboard/TipsCard";
import { Lightbulb, Loader2 } from "lucide-react";

export default function Tips() {
  const { group, loading: groupLoading } = useGroup();
  const { t } = useI18n();

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses", "all", group?.id],
    queryFn: () => getExpenses(group!.id),
    enabled: !!group,
  });

  const isLoading = groupLoading || expensesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/20">
          <Lightbulb className="h-5 w-5 text-warning" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{t("budget.title").replace("grupo", "").trim() || "Dicas & Ofertas"}</h1>
          <p className="text-sm text-muted-foreground">{group.name}</p>
        </div>
      </div>

      {!group.group_type ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <Lightbulb className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Descreva seu grupo nas configuracoes para receber dicas personalizadas de economia, cupons e cashback.
          </p>
        </div>
      ) : (
        <TipsCard
          groupId={group.id}
          groupType={group.group_type}
          currency={group.default_currency}
          expenses={expenses}
        />
      )}
    </div>
  );
}
