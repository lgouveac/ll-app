import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronRight,
  Receipt,
  UtensilsCrossed,
  Car,
  Home,
  Music,
  Heart,
  ShoppingBag,
  Plane,
  MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import MemberAvatar from "@/components/members/MemberAvatar";
import EmptyState from "@/components/shared/EmptyState";
import type { Expense } from "@/types/expense";

interface RecentExpensesProps {
  expenses: Expense[];
  onViewAll: () => void;
  className?: string;
}

const categoryIcons: Record<string, LucideIcon> = {
  food: UtensilsCrossed,
  transport: Car,
  home: Home,
  entertainment: Music,
  health: Heart,
  shopping: ShoppingBag,
  travel: Plane,
  other: MoreHorizontal,
};

function getCategoryIcon(category: string | null): LucideIcon {
  if (!category) return Receipt;
  return categoryIcons[category] ?? Receipt;
}

export default function RecentExpenses({
  expenses,
  onViewAll,
  className,
}: RecentExpensesProps) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Sem despesas ainda"
        description="Adicione a primeira despesa do grupo para comecar a dividir."
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          Despesas recentes
        </h2>
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-sm font-medium text-secondary hover:text-secondary/80 transition-colors"
        >
          Ver todas
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <ul className="space-y-2">
        {expenses.map((expense) => {
          const Icon = getCategoryIcon(expense.category);
          const expenseDate = parseISO(expense.date);

          return (
            <li
              key={expense.id}
              className="flex items-center gap-3 rounded-xl bg-card p-3 transition-colors hover:bg-card/80"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg gradient-romantic-subtle">
                <Icon className="h-5 w-5 text-primary" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-card-foreground">
                  {expense.description}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {expense.payer && (
                    <>
                      <MemberAvatar
                        name={expense.payer.name}
                        color={expense.payer.avatar_color}
                        size="sm"
                        className="!h-4 !w-4 !text-[8px]"
                      />
                      <span className="truncate">{expense.payer.name}</span>
                      <span className="text-border">•</span>
                    </>
                  )}
                  <span>
                    {format(expenseDate, "dd MMM", { locale: ptBR })}
                  </span>
                </div>
              </div>

              <span className="shrink-0 text-sm font-semibold text-card-foreground">
                {formatCurrency(expense.amount, expense.currency)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
