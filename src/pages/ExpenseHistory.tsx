import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { ArrowLeft, Receipt, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useGroup } from "@/hooks/useGroup";
import { getExpenses, deleteExpenses } from "@/services/expenseService";
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
  const queryClient = useQueryClient();
  const { group, members } = useGroup();
  const { t } = useI18n();
  const [filters, setFilters] = useState<Filters>({});
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

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

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((e) => e.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      await deleteExpenses(Array.from(selected));
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(t("history.deleted", { count: selected.size }));
      exitSelectMode();
    } catch {
      toast.error(t("history.deleteError"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 pb-2 pt-4">
          {selectMode ? (
            <>
              <button
                type="button"
                onClick={exitSelectMode}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted transition-colors hover:brightness-125"
              >
                <X className="h-5 w-5 text-foreground" />
              </button>
              <span className="text-sm font-semibold text-foreground">
                {t("history.selected", { count: selected.size })}
              </span>
              <button
                type="button"
                onClick={toggleAll}
                className="ml-auto text-xs font-medium text-primary"
              >
                {selected.size === filtered.length
                  ? t("history.deselectAll")
                  : t("history.selectAll")}
              </button>
            </>
          ) : (
            <>
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
              {filtered.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectMode(true)}
                  className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("history.select")}
                </button>
              )}
            </>
          )}
        </div>

        {!selectMode && (
          <ExpenseFilters onFilter={setFilters} members={members} />
        )}
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
                    <div key={expense.id} className="flex items-center gap-2">
                      {selectMode && (
                        <button
                          type="button"
                          onClick={() => toggleSelect(expense.id)}
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                            selected.has(expense.id)
                              ? "border-primary bg-primary text-white"
                              : "border-border bg-card",
                          )}
                        >
                          {selected.has(expense.id) && <Check className="h-3 w-3" />}
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <ExpenseCard
                          expense={expense}
                          onClick={() =>
                            selectMode
                              ? toggleSelect(expense.id)
                              : navigate(`/expenses/${expense.id}`)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Delete FAB */}
      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-20 flex justify-center px-4 pb-safe">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className={cn(
              "flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg",
              "bg-destructive transition-all active:scale-95",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            <Trash2 className="h-4 w-4" />
            {deleting
              ? t("common.deleting")
              : t("history.deleteSelected", { count: selected.size })}
          </button>
        </div>
      )}
    </div>
  );
}
