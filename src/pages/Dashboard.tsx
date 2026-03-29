import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useGroup } from "@/hooks/useGroup";
import { useI18n } from "@/hooks/useI18n";
import { getRecentExpenses } from "@/services/expenseService";
import BalanceCard from "@/components/dashboard/BalanceCard";
import BudgetBar from "@/components/dashboard/BudgetBar";
import RecentExpenses from "@/components/dashboard/RecentExpenses";
import QuickAddButton from "@/components/dashboard/QuickAddButton";
import { getExpenses } from "@/services/expenseService";

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-card ${className ?? ""}`}>
      <div className="space-y-3 p-5">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-5 w-40 rounded bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { id: groupIdParam } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { group, members, loading: groupLoading, setActiveGroup } = useGroup();
  const { t } = useI18n();
  const userName = user?.email?.split("@")[0] || "";

  // Sync URL param with active group
  useEffect(() => {
    if (groupIdParam && groupIdParam !== group?.id) {
      setActiveGroup(groupIdParam);
    }
  }, [groupIdParam, group?.id, setActiveGroup]);

  const {
    data: expenses = [],
    isLoading: expensesLoading,
  } = useQuery({
    queryKey: ["expenses", "recent", group?.id],
    queryFn: () => getRecentExpenses(group!.id),
    enabled: !!group,
  });

  // All expenses for budget calculation
  const { data: allExpenses = [] } = useQuery({
    queryKey: ["expenses", "all", group?.id],
    queryFn: () => getExpenses(group!.id),
    enabled: !!group,
  });

  // Total spent in group currency
  const totalSpent = allExpenses.reduce((sum, e) => sum + (e.converted_amount ?? e.amount), 0);

  const isLoading = groupLoading || expensesLoading;

  return (
    <div className="pb-safe min-h-screen px-4 pt-6">
      {/* Greeting */}
      <header className="mb-6">
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-4 w-16 rounded bg-muted" />
            <div className="mt-1 h-7 w-44 rounded bg-muted" />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{group?.name}</p>
            <h1 className="text-2xl font-bold text-foreground">
              {t("home.greeting", { name: userName })}
            </h1>
          </>
        )}
      </header>

      {/* Balance Hero */}
      {isLoading ? (
        <SkeletonCard className="mb-6 h-36" />
      ) : (
        <BalanceCard
          expenses={expenses}
          members={members}
          currency={group?.default_currency ?? "USD"}
          className="mb-6"
        />
      )}

      {/* Budget Bar */}
      {!isLoading && group?.budget != null && group.budget > 0 && (
        <BudgetBar
          spent={totalSpent}
          budget={group.budget}
          currency={group.default_currency}
          className="mb-6"
        />
      )}


      {/* Recent Expenses */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="flex justify-between">
            <div className="h-5 w-36 animate-pulse rounded bg-muted" />
            <div className="h-5 w-20 animate-pulse rounded bg-muted" />
          </div>
          <SkeletonCard className="h-16" />
          <SkeletonCard className="h-16" />
          <SkeletonCard className="h-16" />
        </div>
      ) : (
        <RecentExpenses
          expenses={expenses}
          onViewAll={() => navigate("/expenses")}
        />
      )}

      {/* FAB */}
      <QuickAddButton />
    </div>
  );
}
