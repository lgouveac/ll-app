import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { ArrowLeft, Receipt } from "lucide-react";
import { useGroup } from "@/hooks/useGroup";
import { getExpenses } from "@/services/expenseService";
import type { Expense } from "@/types/expense";
import ExpenseCard from "@/components/expense/ExpenseCard";
import ExpenseFilters from "@/components/expense/ExpenseFilters";
import EmptyState from "@/components/shared/EmptyState";
import { useI18n } from "@/hooks/useI18n";

interface Filters {
  paidBy?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}

export default function ExpenseHistory() {
  const navigate = useNavigate();
  const { group, members } = useGroup();
  const { t } = useI18n();
  const [filters, setFilters] = useState<Filters>({});

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", group?.id],
    queryFn: () => getExpenses(group!.id),
    enabled: !!group,
  });

  const filtered = useMemo(() => {
    let result = expenses;

    if (filters.paidBy) {
      result = result.filter((e) => e.paid_by === filters.paidBy);
    }
    if (filters.category) {
      result = result.filter((e) => e.category === filters.category);
    }

    return result;
  }, [expenses, filters]);

  // Group by month
  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>();

    for (const expense of filtered) {
      const key = format(parseISO(expense.date), "MMMM yyyy", {
        locale: ptBR,
      });
      const existing = map.get(key);
      if (existing) {
        existing.push(expense);
      } else {
        map.set(key, [expense]);
      }
    }

    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 pb-2 pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted transition-colors hover:brightness-125"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">{t("history.title")}</h1>
          <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {filtered.length}
          </span>
        </div>

        <ExpenseFilters onFilter={setFilters} members={members} />
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-2">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-[76px] animate-pulse rounded-lg bg-card"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={t("history.empty.title")}
            description={t("history.empty.description")}
          />
        ) : (
          <div className="space-y-5 pb-4">
            {grouped.map(([month, items]) => (
              <section key={month}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {month}
                </h2>
                <div className="space-y-2">
                  {items.map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      onClick={() => navigate(`/expenses/${expense.id}`)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
