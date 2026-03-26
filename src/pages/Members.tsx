import { useState } from "react";
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

export default function Members() {
  const { group, members } = useGroup();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Invite state
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
    queryClient.invalidateQueries({ queryKey: ["group"] });
  }

  const addMutation = useMutation({
    mutationFn: ({ name, colorIndex }: { name: string; colorIndex: number }) =>
      addMember(group!.id, name, colorIndex),
    onSuccess: () => {
      toast.success("Membro adicionado!");
      setNewName("");
      setAddingNew(false);
      invalidateAll();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateMember(id, { name }),
    onSuccess: () => {
      toast.success("Membro atualizado!");
      setEditingId(null);
      invalidateAll();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateMember,
    onSuccess: () => {
      toast.success("Membro desativado");
      invalidateAll();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reactivateMutation = useMutation({
    mutationFn: reactivateMember,
    onSuccess: () => {
      toast.success("Membro reativado!");
      invalidateAll();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const inviteMutation = useMutation({
    mutationFn: ({ memberId, email }: { memberId: string; email: string }) =>
      sendInvitation(group!.id, memberId, email),
    onSuccess: () => {
      toast.success("Convite enviado!");
      setInvitingId(null);
      setInviteEmail("");
      invalidateAll();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addMutation.mutate({ name: trimmed, colorIndex: allMembers.length });
  }

  function handleStartEdit(id: string, currentName: string) {
    setEditingId(id);
    setEditName(currentName);
  }

  function handleSaveEdit() {
    if (!editingId || !editName.trim()) return;
    updateMutation.mutate({ id: editingId, name: editName.trim() });
  }

  function handleDeactivate(id: string) {
    if (!window.confirm("Tem certeza?")) return;
    deactivateMutation.mutate(id);
  }

  function handleSendInvite() {
    if (!invitingId || !inviteEmail.trim()) return;
    inviteMutation.mutate({ memberId: invitingId, email: inviteEmail.trim() });
  }

  function handleKeyDown(e: React.KeyboardEvent, action: "add" | "edit" | "invite") {
    if (e.key === "Enter") {
      e.preventDefault();
      if (action === "add") handleAdd();
      else if (action === "edit") handleSaveEdit();
      else handleSendInvite();
    }
    if (e.key === "Escape") {
      if (action === "add") { setAddingNew(false); setNewName(""); }
      else if (action === "edit") { setEditingId(null); setEditName(""); }
      else { setInvitingId(null); setInviteEmail(""); }
    }
  }

  if (!group) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Membros</h1>
          <p className="text-sm text-muted-foreground">
            {members.length} ativo{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => { setAddingNew(true); setNewName(""); }}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-[#7C3AED] px-4 py-2.5 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
      </div>

      {/* Add new member */}
      {addingNew && (
        <div className="rounded-2xl border border-secondary/30 bg-card p-4">
          <div className="flex items-center gap-3">
            <MemberAvatar
              name={newName || "?"}
              color={getAvatarColor(allMembers.length)}
              size="md"
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "add")}
              placeholder="Nome do membro"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-secondary"
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim() || addMutation.isPending}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-white disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setAddingNew(false); setNewName(""); }}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Active members */}
      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum membro"
          description="Adicione membros ao grupo para comecar"
        />
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
                      <button onClick={handleSaveEdit} disabled={!editName.trim()} className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-white disabled:opacity-40">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <span className="text-sm font-medium">
                          {member.name}
                          {isMe && <span className="ml-1.5 text-xs text-primary">(voce)</span>}
                        </span>
                        {isLinked && !isMe && (
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        )}
                        {!isLinked && (
                          <p className="text-xs text-muted-foreground/50">Sem conta vinculada</p>
                        )}
                      </div>

                      {/* Invite button - only for members without a linked account */}
                      {!isLinked && (
                        <button
                          onClick={() => {
                            setInvitingId(invitingId === member.id ? null : member.id);
                            setInviteEmail("");
                          }}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                            invitingId === member.id
                              ? "bg-secondary/20 text-secondary"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleStartEdit(member.id, member.name)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      {!isMe && (
                        <button
                          onClick={() => handleDeactivate(member.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Invite email input */}
                {invitingId === member.id && (
                  <div className="border-t border-border px-4 py-3">
                    <p className="mb-2 text-xs text-muted-foreground">
                      Enviar convite para {member.name} entrar no grupo:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, "invite")}
                        placeholder="email@exemplo.com"
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-secondary"
                        autoFocus
                      />
                      <button
                        onClick={handleSendInvite}
                        disabled={!inviteEmail.includes("@") || inviteMutation.isPending}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white",
                          "bg-gradient-to-r from-primary to-secondary",
                          "disabled:opacity-40",
                        )}
                      >
                        {inviteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Convidar
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
            onClick={() => setShowInactive((prev) => !prev)}
            className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {showInactive ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Desativados ({inactiveMembers.length})
          </button>

          {showInactive && (
            <div className="space-y-2">
              {inactiveMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card/50 px-4 py-3 opacity-60"
                >
                  <MemberAvatar name={member.name} color={member.avatar_color} size="md" />
                  <span className="flex-1 text-sm text-muted-foreground line-through">
                    {member.name}
                  </span>
                  <button
                    onClick={() => reactivateMutation.mutate(member.id)}
                    className="flex items-center gap-1 rounded-lg bg-secondary/20 px-3 py-1.5 text-xs font-medium text-secondary hover:bg-secondary/30"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Reativar
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
