import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import {
  ArrowLeft,
  Calendar,
  Edit2,
  MoreHorizontal,
  StickyNote,
  Tag,
  Trash2,
  UtensilsCrossed,
  Car,
  Home,
  Music,
  Heart,
  ShoppingBag,
  Plane,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";
import { getExpense, deleteExpense } from "@/services/expenseService";
import { CATEGORIES } from "@/types/expense";
import MemberAvatar from "@/components/members/MemberAvatar";
import { useI18n } from "@/hooks/useI18n";
import { t as tRaw } from "@/i18n";
import { useState } from "react";

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

function getCategoryInfo(categoryValue: string | null) {
  const cat = CATEGORIES.find((c) => c.value === categoryValue);
  if (!cat) return { label: tRaw("category.other"), Icon: MoreHorizontal };
  return { label: cat.label, Icon: iconMap[cat.icon] ?? MoreHorizontal };
}

export default function ExpenseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    data: expense,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["expense", id],
    queryFn: () => getExpense(id!),
    enabled: !!id,
  });

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    try {
      await deleteExpense(id!);
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(t("expense.deleted"));
      navigate(-1);
    } catch {
      toast.error(t("expense.deleteError"));
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-safe">
        <div className="px-4 pt-4">
          <div className="h-9 w-9 animate-pulse rounded-full bg-card" />
        </div>
        <div className="mt-6 space-y-4 px-4">
          <div className="h-8 w-2/3 animate-pulse rounded-lg bg-card" />
          <div className="h-12 w-1/2 animate-pulse rounded-lg bg-card" />
          <div className="h-40 animate-pulse rounded-xl bg-card" />
          <div className="h-32 animate-pulse rounded-xl bg-card" />
        </div>
      </div>
    );
  }

  if (isError || !expense) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">{t("expense.notFound")}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 text-sm font-medium text-primary"
        >
          {t("common.back")}
        </button>
      </div>
    );
  }

  const { label: categoryLabel, Icon: CategoryIcon } = getCategoryInfo(
    expense.category,
  );

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted transition-colors hover:brightness-125"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate(`/edit/${expense.id}`)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted transition-colors hover:brightness-125"
          >
            <Edit2 className="h-4 w-4 text-foreground" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className={cn(
              "flex h-9 items-center justify-center rounded-full px-3 transition-colors",
              confirmDelete
                ? "bg-destructive text-destructive-foreground"
                : "bg-muted text-muted-foreground hover:brightness-125",
            )}
          >
            <Trash2 className="h-4 w-4" />
            {confirmDelete && (
              <span className="ml-1.5 text-xs font-medium">{t("common.confirm")}</span>
            )}
          </button>
        </div>
      </div>

      {/* Main info */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg gradient-romantic-subtle">
            <CategoryIcon className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {categoryLabel}
          </span>
        </div>

        <h1 className="mt-3 text-2xl font-bold text-foreground">
          {expense.description}
        </h1>

        {expense.converted_amount != null && expense.base_currency ? (
          <>
            <p className="mt-1 text-3xl font-extrabold gradient-romantic bg-clip-text text-transparent">
              {formatCurrency(expense.converted_amount, expense.base_currency)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("expense.original", { amount: formatCurrency(expense.amount, expense.currency) })}
              {expense.exchange_rate && ` (taxa: ${expense.exchange_rate.toFixed(4)})`}
            </p>
          </>
        ) : (
          <p className="mt-1 text-3xl font-extrabold gradient-romantic bg-clip-text text-transparent">
            {formatCurrency(expense.amount, expense.currency)}
          </p>
        )}
      </div>

      {/* Photo */}
      {expense.photo_url && (
        <div className="mt-5 px-4">
          <div className="overflow-hidden rounded-xl border border-border">
            <img
              src={expense.photo_url}
              alt={t("photo.label")}
              className="w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      )}

      {/* Meta info */}
      <div className="mt-5 space-y-3 px-4">
        <div className="flex items-center gap-3 rounded-lg bg-card p-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">
            {format(parseISO(expense.date), "EEEE, dd 'de' MMMM 'de' yyyy", {
              locale: ptBR,
            })}
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-card p-3">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">{categoryLabel}</span>
        </div>

        {expense.notes && (
          <div className="flex items-start gap-3 rounded-lg bg-card p-3">
            <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm leading-relaxed text-foreground">
              {expense.notes}
            </p>
          </div>
        )}
      </div>

      {/* Quem pagou */}
      <div className="mt-6 px-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("expense.whoPaid")}
        </h2>
        {expense.payer && (
          <div className="flex items-center gap-3 rounded-lg bg-card p-3">
            <MemberAvatar
              name={expense.payer.name}
              color={expense.payer.avatar_color}
              size="md"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {expense.payer.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("expense.paid", { amount: formatCurrency(expense.converted_amount ?? expense.amount, expense.base_currency ?? expense.currency) })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Divisao */}
      {expense.splits && expense.splits.length > 0 && (
        <div className="mt-6 px-4 pb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("expense.split")}
          </h2>
          <div className="space-y-2">
            {expense.splits.map((split) => (
              <div
                key={split.id}
                className="flex items-center gap-3 rounded-lg bg-card p-3"
              >
                {split.member ? (
                  <MemberAvatar
                    name={split.member.name}
                    color={split.member.avatar_color}
                    size="sm"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {split.member?.name ?? t("common.member")}
                  </p>
                  {split.percentage > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {split.percentage.toFixed(0)}%
                    </p>
                  )}
                </div>

                <p className="shrink-0 text-sm font-semibold text-foreground">
                  {formatCurrency(split.amount, expense.base_currency ?? expense.currency)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 px-4 pb-8 space-y-3">
        <button
          type="button"
          onClick={() => navigate(`/edit/${expense.id}`)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-card"
        >
          <Edit2 className="h-4 w-4" />
          {t("expense.edit")}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors",
            confirmDelete
              ? "bg-destructive text-destructive-foreground"
              : "border border-destructive/30 text-destructive hover:bg-destructive/10",
          )}
        >
          <Trash2 className="h-4 w-4" />
          {confirmDelete ? t("expense.deleteConfirm") : t("expense.deleteButton")}
        </button>
      </div>
    </div>
  );
}
