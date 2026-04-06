import { Heart } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { t } from "@/i18n";
import { calculateBalances } from "@/services/expenseService";
import type { Expense } from "@/types/expense";
import type { Member } from "@/types/group";

interface BalanceCardProps {
  expenses: Expense[];
  members: Member[];
  currency: string;
  userId?: string;
  className?: string;
}

export default function BalanceCard({
  expenses,
  members,
  currency,
  userId,
  className,
}: BalanceCardProps) {
  const balances = calculateBalances(expenses);

  // Find the logged-in user's member
  const currentMember = members.find((m) => m.user_id === userId);
  const userBalance = currentMember ? (balances[currentMember.id] ?? 0) : 0;
  const roundedBalance = Math.round(userBalance * 100) / 100;

  const isSettled = Math.abs(roundedBalance) < 0.01;
  const owes = roundedBalance < 0;

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
        {t("balance.title")}
      </h2>

      {isSettled ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <Heart className="h-8 w-8 fill-white text-white" />
          <p className="text-lg font-semibold text-white">{t("balance.settled")}</p>
          <p className="text-sm text-white/60">
            {t("balance.settledDesc")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 py-4">
          <p className="text-sm font-medium text-white/70">
            {owes ? t("balance.youOwe") : t("balance.youAreOwed")}
          </p>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(Math.abs(roundedBalance), currency)}
          </p>
          <p className="text-sm text-white/60">
            {t("balance.toGroup")}
          </p>
        </div>
      )}
    </div>
  );
}
