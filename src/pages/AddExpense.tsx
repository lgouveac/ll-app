import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  UtensilsCrossed,
  Car,
  Home,
  Music,
  Heart,
  ShoppingBag,
  Plane,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGroup } from "@/hooks/useGroup";
import {
  createExpense,
  updateExpense,
  getExpense,
  uploadPhoto,
} from "@/services/expenseService";
import { convertAmount } from "@/services/currencyService";
import type { SplitType } from "@/types/expense";
import { CATEGORIES } from "@/types/expense";
import type { ExtractedReceipt } from "@/services/receiptExtractor";

import PayerSelector from "@/components/expense/PayerSelector";
import SplitSelector from "@/components/expense/SplitSelector";
import CurrencySelector from "@/components/expense/CurrencySelector";
import PhotoCapture from "@/components/expense/PhotoCapture";

// --- Icon map ---
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  UtensilsCrossed,
  Car,
  Home,
  Music,
  Heart,
  ShoppingBag,
  Plane,
  MoreHorizontal,
};

// --- Zod schema ---
const expenseSchema = z.object({
  description: z.string().min(1, "Descricao obrigatoria"),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  currency: z.string().min(1),
  paid_by: z.string().min(1, "Selecione quem pagou"),
  date: z.string().min(1),
  category: z.string().optional(),
  notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

export default function AddExpense() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const { group, members } = useGroup();

  // Split state (managed outside RHF)
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});

  // Photo state
  const [photo, setPhoto] = useState<File | string | null>(null);

  // Currency conversion cache
  const [convertedPreview, setConvertedPreview] = useState<{
    converted: number;
    rate: number;
  } | null>(null);

  const defaultCurrency = group?.default_currency ?? "BRL";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: 0 as number,
      currency: defaultCurrency,
      paid_by: "",
      date: format(new Date(), "yyyy-MM-dd"),
      category: "",
      notes: "",
    },
  });

  // Watch for reactive values
  const watchedAmount = (watch("amount") as number) || 0;
  const watchedCurrency = watch("currency");
  const watchedCategory = watch("category");
  const watchedPaidBy = watch("paid_by");

  // Set default currency when group loads
  useEffect(() => {
    if (group?.default_currency) {
      setValue("currency", group.default_currency);
    }
  }, [group?.default_currency, setValue]);

  // Initialize selected members when members load
  useEffect(() => {
    if (members.length > 0 && selectedMembers.length === 0 && !isEdit) {
      setSelectedMembers(members.map((m) => m.id));
    }
  }, [members, selectedMembers.length, isEdit]);

  // Default payer to first member
  useEffect(() => {
    if (members.length > 0 && !watchedPaidBy && !isEdit) {
      setValue("paid_by", members[0].id);
    }
  }, [members, watchedPaidBy, isEdit, setValue]);

  // --- Fetch existing expense for edit mode ---
  const { data: existingExpense } = useQuery({
    queryKey: ["expense", id],
    queryFn: () => getExpense(id!),
    enabled: isEdit && !!id,
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (!existingExpense) return;

    reset({
      description: existingExpense.description,
      amount: existingExpense.amount,
      currency: existingExpense.currency,
      paid_by: existingExpense.paid_by,
      date: existingExpense.date,
      category: existingExpense.category ?? "",
      notes: existingExpense.notes ?? "",
    });

    if (existingExpense.photo_url) {
      setPhoto(existingExpense.photo_url);
    }

    if (existingExpense.splits && existingExpense.splits.length > 0) {
      const splitIds = existingExpense.splits.map((s) => s.member_id);
      setSelectedMembers(splitIds);

      // Determine split type
      const allEqual =
        existingExpense.splits.length > 1 &&
        existingExpense.splits.every(
          (s) =>
            Math.abs(s.amount - existingExpense.splits![0].amount) < 0.01,
        );

      if (existingExpense.splits.length === 1) {
        setSplitType("full");
      } else if (allEqual) {
        setSplitType("equal");
      } else {
        setSplitType("custom");
        const amounts: Record<string, number> = {};
        for (const s of existingExpense.splits) {
          amounts[s.member_id] = s.amount;
        }
        setCustomAmounts(amounts);
      }
    }
  }, [existingExpense, reset]);

  // --- Build splits ---
  const computeSplits = useMemo(() => {
    return () => {
      const amount = watchedAmount;
      if (selectedMembers.length === 0 || amount <= 0) return [];

      if (splitType === "equal") {
        const share =
          Math.round((amount / selectedMembers.length) * 100) / 100;
        const pct =
          Math.round((100 / selectedMembers.length) * 100) / 100;
        return selectedMembers.map((mid) => ({
          member_id: mid,
          amount: share,
          percentage: pct,
        }));
      }

      if (splitType === "full") {
        return selectedMembers.map((mid) => ({
          member_id: mid,
          amount,
          percentage: 100,
        }));
      }

      // custom
      return selectedMembers.map((mid) => ({
        member_id: mid,
        amount: customAmounts[mid] || 0,
        percentage:
          amount > 0
            ? Math.round(((customAmounts[mid] || 0) / amount) * 10000) / 100
            : 0,
      }));
    };
  }, [watchedAmount, selectedMembers, splitType, customAmounts]);

  // --- Submit mutation ---
  const mutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      if (!group) throw new Error("Grupo nao encontrado");

      let convertedAmount: number | null = null;
      let baseCurrency: string | null = null;
      let exchangeRate: number | null = null;

      // Currency conversion
      if (data.currency !== defaultCurrency) {
        const result = convertedPreview
          ? convertedPreview
          : await convertAmount(data.amount, data.currency, defaultCurrency);

        convertedAmount = result.converted;
        baseCurrency = defaultCurrency;
        exchangeRate = result.rate;
      }

      const splits = computeSplits();

      // Use converted amount in splits if applicable
      const effectiveAmount = convertedAmount ?? data.amount;
      const adjustedSplits =
        convertedAmount !== null
          ? splits.map((s) => ({
              ...s,
              amount:
                splitType === "custom"
                  ? Math.round(s.amount * (exchangeRate ?? 1) * 100) / 100
                  : Math.round(
                      (effectiveAmount / selectedMembers.length) * 100,
                    ) / 100,
            }))
          : splits;

      // Upload photo if it's a File
      let photoUrl: string | null = null;
      if (photo instanceof File) {
        // For new expenses we need a temp id; for edits we have the id
        const tempId = id ?? crypto.randomUUID();
        photoUrl = await uploadPhoto(group.id, tempId, photo);
      } else if (typeof photo === "string") {
        photoUrl = photo;
      }

      const expensePayload = {
        group_id: group.id,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        converted_amount: convertedAmount,
        base_currency: baseCurrency,
        exchange_rate: exchangeRate,
        paid_by: data.paid_by,
        date: data.date,
        photo_url: photoUrl,
        category: data.category || null,
        notes: data.notes || null,
      };

      if (isEdit && id) {
        return updateExpense(id, expensePayload, adjustedSplits);
      }

      return createExpense(expensePayload, adjustedSplits);
    },
    onSuccess: () => {
      toast.success(
        isEdit ? "Despesa atualizada!" : "Despesa adicionada!",
      );
      navigate("/");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao salvar despesa");
    },
  });

  const onSubmit = (data: Record<string, unknown>) => {
    if (selectedMembers.length === 0) {
      toast.error("Selecione ao menos um participante na divisao");
      return;
    }
    mutation.mutate(data as ExpenseFormData);
  };

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-card"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">
          {isEdit ? "Editar despesa" : "Nova despesa"}
        </h1>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-lg space-y-6 px-4 py-6"
      >
        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Descricao
          </label>
          <input
            {...register("description")}
            placeholder="Ex: Jantar, Uber, Mercado..."
            className={cn(
              "w-full rounded-xl border bg-card px-4 py-3 text-foreground",
              "placeholder:text-muted-foreground/50 outline-none transition-colors",
              errors.description
                ? "border-destructive"
                : "border-border focus:border-primary",
            )}
          />
          {errors.description && (
            <p className="text-xs text-destructive">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Amount + Currency row */}
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Valor
            </label>
            <input
              {...register("amount")}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0,00"
              className={cn(
                "w-full rounded-xl border bg-card px-4 py-3 text-lg font-semibold text-foreground",
                "placeholder:text-muted-foreground/50 outline-none transition-colors",
                errors.amount
                  ? "border-destructive"
                  : "border-border focus:border-primary",
              )}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">
                {errors.amount.message}
              </p>
            )}
          </div>

          <div className="w-32">
            <CurrencySelector
              value={watchedCurrency}
              onChange={(code) => setValue("currency", code)}
              amount={watchedAmount}
              baseCurrency={defaultCurrency}
              onConvertedChange={(converted, rate) =>
                setConvertedPreview({ converted, rate })
              }
            />
          </div>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Data
          </label>
          <input
            {...register("date")}
            type="date"
            className={cn(
              "w-full rounded-xl border border-border bg-card px-4 py-3",
              "text-sm text-foreground outline-none transition-colors",
              "focus:border-primary",
              "[color-scheme:dark]",
            )}
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Categoria
          </label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = ICON_MAP[cat.icon];
              const isActive = watchedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() =>
                    setValue(
                      "category",
                      isActive ? "" : cat.value,
                      { shouldValidate: true },
                    )
                  }
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-colors",
                    isActive
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50",
                  )}
                >
                  {Icon && <Icon className="h-5 w-5" />}
                  <span className="text-[10px] font-medium leading-tight">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payer */}
        <PayerSelector
          members={members}
          value={watchedPaidBy}
          onChange={(id) => setValue("paid_by", id, { shouldValidate: true })}
        />
        {errors.paid_by && (
          <p className="-mt-4 text-xs text-destructive">
            {errors.paid_by.message}
          </p>
        )}

        {/* Split */}
        <SplitSelector
          members={members}
          selectedMembers={selectedMembers}
          splitType={splitType}
          customAmounts={customAmounts}
          totalAmount={watchedAmount}
          onSplitTypeChange={setSplitType}
          onSelectedMembersChange={setSelectedMembers}
          onCustomAmountsChange={setCustomAmounts}
        />

        {/* Photo */}
        <PhotoCapture
          value={photo}
          onChange={setPhoto}
          onExtracted={(data: ExtractedReceipt) => {
            if (data.description) setValue("description", data.description);
            if (data.amount > 0) setValue("amount", data.amount);
            if (data.currency) setValue("currency", data.currency);
            if (data.date) setValue("date", data.date);
            if (data.category) setValue("category", data.category);
            if (data.items?.length > 0) {
              const itemNotes = data.items
                .map((i) => `${i.name}: ${i.amount.toFixed(2)}`)
                .join("\n");
              setValue("notes", itemNotes);
            }
          }}
        />

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Notas
          </label>
          <textarea
            {...register("notes")}
            rows={3}
            placeholder="Observacoes opcionais..."
            className={cn(
              "w-full resize-none rounded-xl border border-border bg-card px-4 py-3",
              "text-sm text-foreground placeholder:text-muted-foreground/50",
              "outline-none transition-colors focus:border-primary",
            )}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className={cn(
            "w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all",
            "bg-gradient-to-r from-primary to-[#7C3AED]",
            "hover:opacity-90 active:scale-[0.98]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {mutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </span>
          ) : isEdit ? (
            "Atualizar despesa"
          ) : (
            "Adicionar despesa"
          )}
        </button>
      </form>
    </div>
  );
}
