import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import {
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
import type { Expense } from "@/types/expense";
import { CATEGORIES } from "@/types/expense";
import { cn, formatCurrency } from "@/lib/utils";
import MemberAvatar from "@/components/members/MemberAvatar";

const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Car,
  Home,
  Music,
  Heart,
  ShoppingBag,
  Plane,
  MoreHorizontal,
};

function getCategoryIcon(categoryValue: string | null): LucideIcon {
  const cat = CATEGORIES.find((c) => c.value === categoryValue);
  if (!cat) return MoreHorizontal;
  return iconMap[cat.icon] ?? MoreHorizontal;
}

function getCategoryLabel(categoryValue: string | null): string {
  const cat = CATEGORIES.find((c) => c.value === categoryValue);
  return cat?.label ?? "Outros";
}

interface ExpenseCardProps {
  expense: Expense;
  onClick: () => void;
}

export default function ExpenseCard({ expense, onClick }: ExpenseCardProps) {
  const Icon = getCategoryIcon(expense.category);
  const splitCount = expense.splits?.length ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg bg-card p-3 text-left",
        "transition-all duration-150 active:scale-[0.98]",
        "hover:brightness-110",
      )}
    >
      {/* Category icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg gradient-romantic-subtle">
        <Icon className="h-5 w-5 text-primary" />
      </div>

      {/* Center: description, date, payer */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {expense.description}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {format(parseISO(expense.date), "dd MMM yyyy", { locale: ptBR })}
        </p>
        {expense.payer && (
          <div className="mt-1 flex items-center gap-1.5">
            <MemberAvatar
              name={expense.payer.name}
              color={expense.payer.avatar_color}
              size="sm"
              className="!h-4 !w-4 !text-[8px]"
            />
            <span className="truncate text-xs text-muted-foreground">
              {expense.payer.name}
            </span>
          </div>
        )}
      </div>

      {/* Right: amount + split */}
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-foreground">
          {formatCurrency(expense.amount, expense.currency)}
        </p>
        {splitCount > 1 && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            &divide; {splitCount}
          </p>
        )}
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {getCategoryLabel(expense.category)}
        </p>
      </div>
    </button>
  );
}
