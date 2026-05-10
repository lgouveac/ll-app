import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Heart, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";
import { getMyInvitations, acceptInvitation, declineInvitation } from "@/services/invitationService";
import {
  getMyPendingTransfers,
  approveTransfer,
  rejectTransfer,
  cancelTransfer,
} from "@/services/transferService";
import MemberAvatar from "@/components/members/MemberAvatar";
import EmptyState from "@/components/shared/EmptyState";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";

export default function Invitations() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { user } = useAuth();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["invitations"],
    queryFn: getMyInvitations,
  });

  const { data: transfers = [], isLoading: transfersLoading } = useQuery({
    queryKey: ["balance-transfers", "pending"],
    queryFn: getMyPendingTransfers,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["balance-transfers"] });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  };

  const approveMutation = useMutation({
    mutationFn: approveTransfer,
    onSuccess: () => {
      toast.success(t("transfer.approved"));
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: rejectTransfer,
    onSuccess: () => {
      toast.success(t("transfer.rejected"));
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelTransfer,
    onSuccess: () => {
      toast.success(t("transfer.cancelled"));
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const acceptMutation = useMutation({
    mutationFn: acceptInvitation,
    onSuccess: () => {
      toast.success(t("invitations.accepted"));
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      queryClient.invalidateQueries({ queryKey: ["group"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const declineMutation = useMutation({
    mutationFn: declineInvitation,
    onSuccess: () => {
      toast.success(t("invitations.declined"));
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || transfersLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const incomingTransfers = transfers.filter((tr) => tr.to_member?.id && tr.initiator_user_id !== user?.id);
  const outgoingTransfers = transfers.filter((tr) => tr.initiator_user_id === user?.id);

  if (invitations.length === 0 && incomingTransfers.length === 0 && outgoingTransfers.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title={t("invitations.empty.title")}
        description={t("invitations.empty.description")}
      />
    );
  }

  return (
    <div className="space-y-6">
      {invitations.length > 0 && (
      <section className="space-y-3">
      <h2 className="text-lg font-bold">{t("invitations.pending")}</h2>

      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-center gap-3 mb-3">
            {inv.member && (
              <MemberAvatar
                name={inv.member.name}
                color={inv.member.avatar_color}
                size="md"
              />
            )}
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {inv.group?.name ?? "Grupo"}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("invitations.invitedAs", { name: inv.member?.name ?? "" })}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => acceptMutation.mutate(inv.id)}
              disabled={acceptMutation.isPending || declineMutation.isPending}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5",
                "bg-gradient-to-r from-primary to-[#7C3AED] text-white font-medium text-sm",
                "transition-opacity disabled:opacity-50",
              )}
            >
              {acceptMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {t("invitations.accept")}
            </button>
            <button
              onClick={() => declineMutation.mutate(inv.id)}
              disabled={acceptMutation.isPending || declineMutation.isPending}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg px-4 py-2.5",
                "border border-border text-muted-foreground text-sm",
                "transition-colors hover:bg-card disabled:opacity-50",
              )}
            >
              <X className="h-4 w-4" />
              {t("invitations.decline")}
            </button>
          </div>
        </div>
      ))}
      </section>
      )}

      {incomingTransfers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">{t("transfer.incomingTitle")}</h2>
          {incomingTransfers.map((tr) => {
            const targetAmount = tr.converted_amount ?? tr.amount;
            return (
              <div key={tr.id} className="rounded-xl border border-secondary/30 bg-card p-4">
                <div className="mb-3 flex items-center gap-3">
                  {tr.from_member && (
                    <MemberAvatar name={tr.from_member.name} color={tr.from_member.avatar_color} size="md" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {t("transfer.incomingFrom", { name: tr.from_member?.name ?? "" })}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{tr.from_group?.name}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{tr.to_group?.name}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-3 rounded-lg bg-background/50 p-3">
                  <p className="text-xs text-muted-foreground">{t("transfer.amountToReceive")}</p>
                  <p className="text-base font-semibold text-foreground">
                    {formatCurrency(targetAmount, tr.to_currency)}
                  </p>
                  {tr.from_currency !== tr.to_currency && (
                    <p className="text-[10px] text-muted-foreground">
                      {formatCurrency(tr.amount, tr.from_currency)}
                      {" · "}
                      1 {tr.from_currency} = {tr.exchange_rate?.toFixed(4)} {tr.to_currency}
                    </p>
                  )}
                  {tr.note && <p className="mt-2 text-xs italic text-muted-foreground">"{tr.note}"</p>}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => approveMutation.mutate(tr.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5",
                      "bg-gradient-to-r from-primary to-[#7C3AED] text-sm font-medium text-white",
                      "transition-opacity disabled:opacity-50",
                    )}
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {t("transfer.approveButton")}
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(tr.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg px-4 py-2.5",
                      "border border-border text-sm text-muted-foreground",
                      "transition-colors hover:bg-card disabled:opacity-50",
                    )}
                  >
                    <X className="h-4 w-4" />
                    {t("transfer.rejectButton")}
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {outgoingTransfers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">{t("transfer.outgoingTitle")}</h2>
          {outgoingTransfers.map((tr) => (
            <div key={tr.id} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-3">
                {tr.to_member && (
                  <MemberAvatar name={tr.to_member.name} color={tr.to_member.avatar_color} size="md" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {t("transfer.outgoingTo", { name: tr.to_member?.name ?? "" })}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{tr.from_group?.name}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{tr.to_group?.name}</span>
                  </div>
                </div>
              </div>
              <div className="mb-3 rounded-lg bg-background/50 p-3">
                <p className="text-xs text-muted-foreground">{t("transfer.awaitingApproval")}</p>
                <p className="text-base font-semibold text-foreground">
                  {formatCurrency(tr.amount, tr.from_currency)}
                </p>
              </div>
              <button
                onClick={() => cancelMutation.mutate(tr.id)}
                disabled={cancelMutation.isPending}
                className={cn(
                  "w-full rounded-lg border border-border py-2 text-sm text-muted-foreground",
                  "transition-colors hover:bg-card disabled:opacity-50",
                )}
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  t("transfer.cancelButton")
                )}
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
