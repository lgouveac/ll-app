import { Heart, ArrowRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { calculateBalances, simplifyDebts } from "@/services/expenseService";
import MemberAvatar from "@/components/members/MemberAvatar";
import type { Expense } from "@/types/expense";
import type { Member } from "@/types/group";

interface BalanceCardProps {
  expenses: Expense[];
  members: Member[];
  currency: string;
  className?: string;
}

export default function BalanceCard({
  expenses,
  members,
  currency,
  className,
}: BalanceCardProps) {
  const balances = calculateBalances(expenses);
  const debts = simplifyDebts(balances);

  const memberMap = new Map(members.map((m) => [m.id, m]));

  const isSettled = debts.length === 0;

  return (
    <div
      className={cn(
        "gradient-romantic relative overflow-hidden rounded-xl p-5",
        className,
      )}
    >
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-white/70">
        Saldo do grupo
      </h2>

      {isSettled ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <Heart className="h-8 w-8 fill-white text-white" />
          <p className="text-lg font-semibold text-white">Tudo acertado!</p>
          <p className="text-sm text-white/60">
            Nenhuma divida pendente
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {debts.map((debt) => {
            const fromMember = memberMap.get(debt.from);
            const toMember = memberMap.get(debt.to);

            if (!fromMember || !toMember) return null;

            return (
              <li
                key={`${debt.from}-${debt.to}`}
                className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5 backdrop-blur-sm"
              >
                <MemberAvatar
                  name={fromMember.name}
                  color={fromMember.avatar_color}
                  size="sm"
                />

                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-sm font-medium text-white">
                    {fromMember.name}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/50" />
                  <span className="truncate text-sm font-medium text-white">
                    {toMember.name}
                  </span>
                </div>

                <MemberAvatar
                  name={toMember.name}
                  color={toMember.avatar_color}
                  size="sm"
                />

                <span className="shrink-0 text-sm font-bold text-white">
                  {formatCurrency(debt.amount, currency)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
