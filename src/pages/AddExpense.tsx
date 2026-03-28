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
import { useAuth } from "@/hooks/useAuth";
import { useGroup } from "@/hooks/useGroup";
import {
  createExpense,
  createMultipleExpenses,
  updateExpense,
  getExpense,
  uploadPhoto,
} from "@/services/expenseService";
import { convertAmount, convertAmountForDate } from "@/services/currencyService";
import type { SplitType } from "@/types/expense";
import { CATEGORIES, CURRENCIES } from "@/types/expense";
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

  const { user } = useAuth();
  const { group, members } = useGroup();

  // Split state (managed outside RHF)
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});

  // Files state (supports batch)
  const [files, setFiles] = useState<File[] | null>(null);

  // Extracted expenses from AI (multiple)
  const [extractedExpenses, setExtractedExpenses] = useState<
    Array<{ description: string; amount: number; currency: string; date: string | null; category: string | null; selected: boolean }>
  >([]);
  const [showExtracted, setShowExtracted] = useState(false);
  const [savingMultiple, setSavingMultiple] = useState(false);
  const [extractedCurrency, setExtractedCurrency] = useState("");
  const [extractedDate, setExtractedDate] = useState("");

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

  // Currency is set via defaultValues (defaultCurrency from group) and NOT overwritten by useEffect

  // Initialize selected members when members load
  useEffect(() => {
    if (members.length > 0 && selectedMembers.length === 0 && !isEdit) {
      setSelectedMembers(members.map((m) => m.id));
    }
  }, [members, selectedMembers.length, isEdit]);

  // Default payer to current user's member (or first member as fallback)
  useEffect(() => {
    if (members.length > 0 && !watchedPaidBy && !isEdit) {
      const myMember = members.find((m) => m.user_id === user?.id);
      setValue("paid_by", myMember?.id ?? members[0].id);
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

    // Existing photos are URLs — not editable as File[] for now

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

      // Upload first image file as photo
      let photoUrl: string | null = null;
      if (files && files.length > 0) {
        const firstImage = files.find((f) => f.type.startsWith("image/"));
        if (firstImage) {
          const tempId = id ?? crypto.randomUUID();
          photoUrl = await uploadPhoto(group.id, tempId, firstImage);
        }
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
          value={files}
          onChange={setFiles}
          onExtracted={(data: ExtractedReceipt) => {
            console.log("[AddExpense] Extracted data:", data);
            const opts = { shouldValidate: true, shouldDirty: true, shouldTouch: true };

            // Set currency from receipt
            if (data.currency) {
              setValue("currency", data.currency, opts);
            }
            if (data.date) setValue("date", data.date, opts);

            if (data.expenses.length === 1) {
              // Single expense: fill form directly
              const exp = data.expenses[0];
              if (exp.description) setValue("description", exp.description, opts);
              if (exp.amount > 0) setValue("amount", exp.amount, opts);
              if (exp.category) setValue("category", exp.category, opts);
            } else if (data.expenses.length > 1) {
              // Multiple expenses: show list for user to pick
              setExtractedCurrency(data.currency || "USD");
              setExtractedDate(data.date || format(new Date(), "yyyy-MM-dd"));
              setExtractedExpenses(
                data.expenses.map((e) => ({ ...e, selected: true }))
              );
              setShowExtracted(true);
            }
          }}
        />

        {/* Extracted expenses list */}
        {showExtracted && extractedExpenses.length > 0 && (
          <div className="rounded-xl border border-secondary/30 bg-card p-4 space-y-4">
            <p className="text-sm font-semibold text-foreground">
              {extractedExpenses.length} gastos detectados
            </p>

            {/* Editable currency + date */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">Moeda</label>
                <select
                  value={extractedCurrency}
                  onChange={(e) => setExtractedCurrency(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-secondary"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.code} - {c.symbol}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">Data</label>
                <input
                  type="date"
                  value={extractedDate}
                  onChange={(e) => setExtractedDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-secondary"
                />
              </div>
            </div>

            {/* Items list */}
            <div className="space-y-2">
              {extractedExpenses.map((exp, idx) => (
                <label
                  key={idx}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                    exp.selected ? "border-secondary/50 bg-secondary/5" : "border-border bg-background opacity-60",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={exp.selected}
                    onChange={() => {
                      const updated = [...extractedExpenses];
                      updated[idx] = { ...updated[idx], selected: !updated[idx].selected };
                      setExtractedExpenses(updated);
                    }}
                    className="h-4 w-4 shrink-0 rounded accent-secondary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{exp.description}</p>
                    <p className="text-xs text-muted-foreground">{exp.category}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0">
                    {exp.amount.toFixed(2)}
                  </span>
                </label>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">
                {extractedExpenses.filter((e) => e.selected).length} selecionados
              </span>
              <span className="text-sm font-bold text-foreground">
                Total: {extractedExpenses.filter((e) => e.selected).reduce((s, e) => s + e.amount, 0).toFixed(2)} {extractedCurrency}
              </span>
            </div>

            {/* Save button */}
            <button
              type="button"
              disabled={savingMultiple || !watchedPaidBy || selectedMembers.length === 0}
              onClick={async () => {
                const selected = extractedExpenses.filter((e) => e.selected);
                if (selected.length === 0) {
                  toast.error("Selecione ao menos um gasto");
                  return;
                }
                if (!watchedPaidBy) {
                  toast.error("Selecione quem pagou primeiro");
                  return;
                }
                if (selectedMembers.length === 0) {
                  toast.error("Selecione os participantes da divisao primeiro");
                  return;
                }
                if (!group) return;

                setSavingMultiple(true);
                try {
                  // Convert if currency differs from group default
                  let exchangeRate: number | null = null;
                  let baseCurrency: string | null = null;
                  const needsConversion = extractedCurrency !== defaultCurrency;
                  const expenseDate = extractedDate || format(new Date(), "yyyy-MM-dd");

                  if (needsConversion) {
                    const convResult = await convertAmountForDate(1, extractedCurrency, defaultCurrency, expenseDate);
                    exchangeRate = convResult.rate;
                    baseCurrency = defaultCurrency;
                  }

                  await createMultipleExpenses(
                    {
                      group_id: group.id,
                      currency: extractedCurrency,
                      converted_amount: null, // set per-item below
                      base_currency: baseCurrency,
                      exchange_rate: exchangeRate,
                      paid_by: watchedPaidBy,
                      date: extractedDate || format(new Date(), "yyyy-MM-dd"),
                      photo_url: null,
                      notes: null,
                    },
                    selected.map((e) => ({
                      description: e.description,
                      amount: e.amount,
                      category: e.category,
                      converted_amount: needsConversion && exchangeRate
                        ? Math.round(e.amount * exchangeRate * 100) / 100
                        : null,
                    })),
                    "equal",
                    selectedMembers
                  );

                  toast.success(`${selected.length} despesas criadas!`);
                  setShowExtracted(false);
                  setExtractedExpenses([]);
                  navigate("/");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Erro ao salvar");
                } finally {
                  setSavingMultiple(false);
                }
              }}
              className={cn(
                "w-full rounded-xl py-3 text-sm font-semibold text-white",
                "bg-gradient-to-r from-primary to-[#7C3AED]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {savingMultiple ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </span>
              ) : (
                `Salvar ${extractedExpenses.filter((e) => e.selected).length} despesas separadas`
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowExtracted(false)}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        )}

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
