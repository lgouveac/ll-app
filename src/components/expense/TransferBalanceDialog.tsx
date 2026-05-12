import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import {
  createTransfer,
  listEligibleTargetGroups,
} from "@/services/transferService";
import { convertAmount } from "@/services/currencyService";
import MemberAvatar from "@/components/members/MemberAvatar";
import type { Member } from "@/types/group";

interface TransferBalanceDialogProps {
  open: boolean;
  onClose: () => void;
  sourceGroupId: string;
  sourceGroupName: string;
  sourceCurrency: string;
  /** Counterparty: the member the current user owes / is owed by. */
  counterparty: Member;
  /** Source-side current-user member (the initiator). */
  initiatorMember: Member;
  /** Absolute value of debt between the two parties in this group. */
  maxAmount: number;
  /** true if user owes counterparty; false if user is owed. */
  userOwes: boolean;
}

export default function TransferBalanceDialog({
  open,
  onClose,
  sourceGroupId,
  sourceGroupName,
  sourceCurrency,
  counterparty,
  initiatorMember,
  maxAmount,
  userOwes,
}: TransferBalanceDialogProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState<string>(maxAmount.toFixed(2));
  const [targetGroupId, setTargetGroupId] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [convertedPreview, setConvertedPreview] = useState<{ converted: number; rate: number } | null>(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(maxAmount.toFixed(2));
      setNote("");
      setTargetGroupId("");
      setConvertedPreview(null);
    }
  }, [open, maxAmount]);

  const counterpartyUserId = counterparty.user_id;

  const { data: targets = [], isLoading: targetsLoading } = useQuery({
    queryKey: ["eligible-targets", sourceGroupId, counterpartyUserId],
    queryFn: () => listEligibleTargetGroups(sourceGroupId, counterpartyUserId!),
    enabled: open && !!counterpartyUserId,
  });

  const selectedTarget = useMemo(
    () => targets.find((tg) => tg.group.id === targetGroupId) ?? null,
    [targets, targetGroupId],
  );

  // Auto-select if only one eligible target
  useEffect(() => {
    if (open && targets.length === 1 && !targetGroupId) {
      setTargetGroupId(targets[0].group.id);
    }
  }, [open, targets, targetGroupId]);

  const numericAmount = Number(amount) || 0;
  const targetCurrency = selectedTarget?.group.default_currency ?? sourceCurrency;
  const needsConversion = targetCurrency !== sourceCurrency && numericAmount > 0;

  useEffect(() => {
    if (!needsConversion) {
      setConvertedPreview(null);
      return;
    }
    setConverting(true);
    const handle = setTimeout(async () => {
      try {
        const result = await convertAmount(numericAmount, sourceCurrency, targetCurrency);
        setConvertedPreview(result);
      } catch {
        setConvertedPreview(null);
      } finally {
        setConverting(false);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [numericAmount, sourceCurrency, targetCurrency, needsConversion]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedTarget) throw new Error(t("transfer.errorNoTarget"));
      if (numericAmount <= 0) throw new Error(t("transfer.errorInvalidAmount"));
      if (numericAmount > maxAmount + 0.001) throw new Error(t("transfer.errorOverMax"));

      // If user OWES the counterparty: debtor (initiator) is fromMember,
      //   creditor (counterparty) is toMember. The transfer cancels the debt
      //   in source and creates the equivalent in target.
      // If user IS OWED: roles invert — counterparty owes the user, so the
      //   initiator (still current user) creates a transfer where the
      //   counterparty is the from_member (debtor) and the user is the
      //   to_member. But our policy requires from_member.user_id = auth.uid().
      //   So in that case we instead initiate it as the *creditor* moving
      //   the claim — semantically: counterparty is debtor moving debt over.
      // To keep policy simple, we only allow transfer from the perspective of
      //   the debtor. If user is owed, they shouldn't be initiating.
      if (!userOwes) throw new Error(t("transfer.errorOnlyDebtorInitiates"));

      const fromMemberId = initiatorMember.id;
      const toMemberId = counterparty.id;

      return createTransfer({
        fromGroupId: sourceGroupId,
        toGroupId: selectedTarget.group.id,
        fromMemberId,
        toMemberId,
        amount: numericAmount,
        fromCurrency: sourceCurrency,
        toCurrency: targetCurrency,
        note: note.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success(t("transfer.requestSent"));
      queryClient.invalidateQueries({ queryKey: ["balance-transfers"] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="relative w-full max-w-md rounded-t-2xl bg-background p-6 sm:rounded-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full hover:bg-card"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        <h2 className="mb-1 text-lg font-bold text-foreground">{t("transfer.title")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {userOwes
            ? t("transfer.subtitleOwes", { name: counterparty.name })
            : t("transfer.subtitleOwed", { name: counterparty.name })}
        </p>

        {/* Counterparty preview */}
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          <MemberAvatar name={counterparty.name} color={counterparty.avatar_color} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{counterparty.name}</p>
            <p className="text-xs text-muted-foreground">
              {t("transfer.balanceLabel")}: {formatCurrency(maxAmount, sourceCurrency)}
            </p>
          </div>
        </div>

        {/* Target group */}
        <div className="mb-4 space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            {t("transfer.targetGroup")}
          </label>
          {targetsLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
            </div>
          ) : targets.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              {t("transfer.noEligibleGroups")}
            </div>
          ) : (
            <select
              value={targetGroupId}
              onChange={(e) => setTargetGroupId(e.target.value)}
              className={cn(
                "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground",
                "outline-none transition-colors focus:border-primary",
              )}
            >
              <option value="">{t("transfer.selectTarget")}</option>
              {targets.map((tg) => (
                <option key={tg.group.id} value={tg.group.id}>
                  {tg.group.name} ({tg.group.default_currency})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Amount */}
        <div className="mb-4 space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            {t("transfer.amountLabel", { currency: sourceCurrency })}
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            max={maxAmount}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={cn(
              "w-full rounded-xl border border-border bg-card px-4 py-3 text-lg font-semibold text-foreground",
              "outline-none transition-colors focus:border-primary",
            )}
          />
          <p className="text-xs text-muted-foreground">
            {t("transfer.maxAllowed", { amount: formatCurrency(maxAmount, sourceCurrency) })}
          </p>
        </div>

        {/* Conversion preview */}
        {needsConversion && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-card px-4 py-3">
            <span className="text-xs text-muted-foreground">{sourceCurrency}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{targetCurrency}</span>
            <div className="ml-auto text-right">
              {converting ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : convertedPreview ? (
                <>
                  <p className="text-sm font-semibold text-foreground">
                    ≈ {formatCurrency(convertedPreview.converted, targetCurrency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    1 {sourceCurrency} = {convertedPreview.rate.toFixed(4)} {targetCurrency}
                  </p>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Note */}
        <div className="mb-5 space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            {t("transfer.noteOptional")}
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("transfer.notePlaceholder", { source: sourceGroupName })}
            className={cn(
              "w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground",
              "placeholder:text-muted-foreground/50 outline-none focus:border-primary",
            )}
          />
        </div>

        {/* Submit */}
        <button
          type="button"
          disabled={
            mutation.isPending ||
            !targetGroupId ||
            numericAmount <= 0 ||
            numericAmount > maxAmount + 0.001 ||
            !userOwes
          }
          onClick={() => mutation.mutate()}
          className={cn(
            "w-full rounded-xl py-3 text-sm font-semibold text-white",
            "bg-gradient-to-r from-primary to-[#7C3AED]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {mutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.saving")}
            </span>
          ) : (
            t("transfer.requestButton")
          )}
        </button>

        {!userOwes && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {t("transfer.onlyDebtorCanInitiate")}
          </p>
        )}
      </div>
    </div>
  );
}
