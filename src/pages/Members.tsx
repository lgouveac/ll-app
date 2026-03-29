import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Check,
  X,
  UserMinus,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Users,
  Mail,
  Loader2,
  Send,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useGroup } from "@/hooks/useGroup";
import { useAuth } from "@/hooks/useAuth";
import { getAvatarColor } from "@/lib/utils";
import {
  addMember,
  updateMember,
  deactivateMember,
  reactivateMember,
  getAllMembers,
} from "@/services/memberService";
import { sendInvitation } from "@/services/invitationService";
import MemberAvatar from "@/components/members/MemberAvatar";
import EmptyState from "@/components/shared/EmptyState";
import { useI18n } from "@/hooks/useI18n";

export default function Members() {
  const { group, members } = useGroup();
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: allMembers = [] } = useQuery({
    queryKey: ["members", "all", group?.id],
    queryFn: () => getAllMembers(group!.id),
    enabled: !!group,
  });

  const inactiveMembers = allMembers.filter((m) => !m.is_active);

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["members"] });
    queryClient.invalidateQueries({ queryKey: ["groups"] });
    queryClient.invalidateQueries({ queryKey: ["group"] });
  }

  const addMutation = useMutation({
    mutationFn: async ({ name, email, colorIndex }: { name: string; email: string; colorIndex: number }) => {
      const member = await addMember(group!.id, name, colorIndex);
      // If email provided, auto-send invitation
      if (email.trim()) {
        try {
          await sendInvitation(group!.id, member.id, email.trim());
        } catch (err) {
          console.warn("Auto-invite failed:", err);
          // Don't fail the whole operation
        }
      }
      return member;
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.email
          ? t("members.addedAndInvited")
          : t("members.added")
      );
      setNewName("");
      setNewEmail("");
      setAddingNew(false);
      invalidateAll();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateMember(id, { name }),
    onSuccess: () => {
      toast.success(t("members.updated"));
      setEditingId(null);
      invalidateAll();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateMember,
    onSuccess: () => { toast.success(t("members.deactivated")); invalidateAll(); },
    onError: (error: Error) => toast.error(error.message),
  });

  const reactivateMutation = useMutation({
    mutationFn: reactivateMember,
    onSuccess: () => { toast.success(t("members.reactivated")); invalidateAll(); },
    onError: (error: Error) => toast.error(error.message),
  });

  const inviteMutation = useMutation({
    mutationFn: ({ memberId, email }: { memberId: string; email: string }) =>
      sendInvitation(group!.id, memberId, email),
    onSuccess: () => {
      toast.success(t("members.inviteSent"));
      setInvitingId(null);
      setInviteEmail("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addMutation.mutate({ name: trimmed, email: newEmail, colorIndex: allMembers.length });
  }

  function handleKeyDown(e: React.KeyboardEvent, action: "add" | "edit" | "invite") {
    if (e.key === "Enter") {
      e.preventDefault();
      if (action === "add") handleAdd();
      else if (action === "edit") {
        if (editingId && editName.trim()) updateMutation.mutate({ id: editingId, name: editName.trim() });
      }
      else if (invitingId && inviteEmail.trim()) inviteMutation.mutate({ memberId: invitingId, email: inviteEmail.trim() });
    }
    if (e.key === "Escape") {
      if (action === "add") { setAddingNew(false); setNewName(""); setNewEmail(""); }
      else if (action === "edit") { setEditingId(null); }
      else { setInvitingId(null); setInviteEmail(""); }
    }
  }

  if (!group) return null;

  return (
    <div className="space-y-4">
      {/* Header + actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{group.name}</h1>
          <p className="text-sm text-muted-foreground">
            {members.length !== 1 ? t("members.countPlural", { count: members.length }) : t("members.count", { count: members.length })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/invitations")}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-card"
          >
            <Inbox className="h-4 w-4" />
            {t("members.invites")}
          </button>
          <button
            onClick={() => { setAddingNew(true); setNewName(""); setNewEmail(""); }}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-[#7C3AED] px-3 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            {t("common.add")}
          </button>
        </div>
      </div>

      {/* Add new member — with email for instant invite */}
      {addingNew && (
        <div className="rounded-2xl border border-secondary/30 bg-card p-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{t("members.new")}</p>
          <div className="flex items-center gap-3">
            <MemberAvatar name={newName || "?"} color={getAvatarColor(allMembers.length)} size="md" />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "add")}
              placeholder={t("setup.namePlaceholder")}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-secondary"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 flex justify-center">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "add")}
              placeholder={t("members.emailPlaceholder")}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-secondary"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setAddingNew(false); setNewName(""); setNewEmail(""); }}
              className="flex-1 rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-accent"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleAdd}
              disabled={!newName.trim() || addMutation.isPending}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-white",
                "bg-gradient-to-r from-primary to-secondary disabled:opacity-40",
              )}
            >
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {newEmail.trim() ? t("members.addAndInvite") : t("common.add")}
            </button>
          </div>
        </div>
      )}

      {/* Active members */}
      {members.length === 0 ? (
        <EmptyState icon={Users} title={t("members.empty.title")} description={t("members.empty.description")} />
      ) : (
        <div className="space-y-2">
          {members.map((member) => {
            const isMe = member.user_id === user?.id;
            const isLinked = !!member.user_id;

            return (
              <div key={member.id} className="rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-3 px-4 py-3">
                  <MemberAvatar name={member.name} color={member.avatar_color} size="md" />

                  {editingId === member.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, "edit")}
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-secondary"
                        autoFocus
                      />
                      <button onClick={() => { if (editName.trim()) updateMutation.mutate({ id: member.id, name: editName.trim() }); }} className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-white disabled:opacity-40">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{member.name}</span>
                          {isMe && <span className="shrink-0 text-[10px] text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded-full">voce</span>}
                        </div>
                        {isLinked ? (
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        ) : (
                          <p className="text-xs text-warning">{t("members.noAccount")}</p>
                        )}
                      </div>

                      {/* Actions */}
                      {!isLinked && (
                        <button
                          onClick={() => { setInvitingId(invitingId === member.id ? null : member.id); setInviteEmail(""); }}
                          title={t("members.inviteByEmail")}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                            invitingId === member.id ? "bg-secondary/20 text-secondary" : "text-muted-foreground hover:bg-accent"
                          )}
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => { setEditingId(member.id); setEditName(member.name); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent">
                        <Pencil className="h-4 w-4" />
                      </button>
                      {!isMe && (
                        <button onClick={() => { if (window.confirm("Remover " + member.name + "?")) deactivateMutation.mutate(member.id); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/20 hover:text-destructive">
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Inline invite */}
                {invitingId === member.id && (
                  <div className="border-t border-border px-4 py-3">
                    <p className="mb-2 text-xs text-muted-foreground">
                      {t("members.sendInviteTo", { name: member.name })}
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, "invite")}
                        placeholder={t("members.emailExample")}
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-secondary"
                        autoFocus
                      />
                      <button
                        onClick={() => { if (inviteEmail.trim()) inviteMutation.mutate({ memberId: member.id, email: inviteEmail.trim() }); }}
                        disabled={!inviteEmail.includes("@") || inviteMutation.isPending}
                        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-secondary px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                      >
                        {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {t("members.invite")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Inactive members */}
      {inactiveMembers.length > 0 && (
        <div>
          <button
            onClick={() => setShowInactive((v) => !v)}
            className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {showInactive ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {t("members.removed", { count: inactiveMembers.length })}
          </button>
          {showInactive && (
            <div className="space-y-2">
              {inactiveMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card/50 px-4 py-3 opacity-60">
                  <MemberAvatar name={m.name} color={m.avatar_color} size="md" />
                  <span className="flex-1 text-sm text-muted-foreground line-through">{m.name}</span>
                  <button
                    onClick={() => reactivateMutation.mutate(m.id)}
                    className="flex items-center gap-1 rounded-lg bg-secondary/20 px-3 py-1.5 text-xs font-medium text-secondary hover:bg-secondary/30"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {t("members.reactivate")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
