import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Heart, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getMyInvitations, acceptInvitation, declineInvitation } from "@/services/invitationService";
import MemberAvatar from "@/components/members/MemberAvatar";
import EmptyState from "@/components/shared/EmptyState";
import { useI18n } from "@/hooks/useI18n";

export default function Invitations() {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["invitations"],
    queryFn: getMyInvitations,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title={t("invitations.empty.title")}
        description={t("invitations.empty.description")}
      />
    );
  }

  return (
    <div className="space-y-4">
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
    </div>
  );
}
