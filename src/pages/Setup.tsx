import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, Plus, Trash2, ChevronRight, Users } from "lucide-react";
import { toast } from "sonner";
import { cn, getAvatarColor } from "@/lib/utils";
import { CURRENCIES } from "@/types/expense";
import { createGroup } from "@/services/groupService";
import { addMember } from "@/services/memberService";
import { useAuth } from "@/hooks/useAuth";
import MemberAvatar from "@/components/members/MemberAvatar";

interface PendingMember {
  name: string;
  avatar_color: string;
  isMe: boolean;
}

export default function Setup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const myName = user?.email?.split("@")[0] || "Eu";

  const [step, setStep] = useState<1 | 2>(1);
  const [groupName, setGroupName] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [members, setMembers] = useState<PendingMember[]>([
    { name: myName, avatar_color: getAvatarColor(0), isMe: true },
  ]);
  const [newMemberName, setNewMemberName] = useState("");
  const [saving, setSaving] = useState(false);

  const canProceedStep1 = groupName.trim().length > 0;
  const canFinish = members.length >= 2;

  function handleAddMember() {
    const trimmed = newMemberName.trim();
    if (!trimmed) return;
    if (members.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Ja existe um membro com esse nome");
      return;
    }
    setMembers((prev) => [
      ...prev,
      { name: trimmed, avatar_color: getAvatarColor(prev.length), isMe: false },
    ]);
    setNewMemberName("");
  }

  function handleRemoveMember(index: number) {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (step === 1 && canProceedStep1) {
        setStep(2);
      } else if (step === 2) {
        handleAddMember();
      }
    }
  }

  async function handleFinish() {
    if (!canFinish) return;
    setSaving(true);

    try {
      const group = await createGroup(groupName.trim(), currency);

      // Create all members, linking the creator's user_id to "me"
      await Promise.all(
        members.map((m, i) =>
          addMember(group.id, m.name, i, m.isMe ? user?.id : undefined)
        )
      );

      await queryClient.invalidateQueries({ queryKey: ["group"] });
      await queryClient.invalidateQueries({ queryKey: ["members"] });

      toast.success("Grupo criado com sucesso!");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar grupo"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0A1A]">
      {/* Gradient header */}
      <div className="relative overflow-hidden px-6 pb-10 pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-[#DC2626]/30 via-[#7C3AED]/20 to-transparent" />
        <div className="relative flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#DC2626] to-[#7C3AED]">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Vamos comecar!</h1>
          <p className="mt-2 text-sm text-white/60">
            {step === 1
              ? "Crie seu grupo para comecar a dividir despesas"
              : "Adicione os membros do grupo"}
          </p>

          {/* Step indicator */}
          <div className="mt-6 flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-8 rounded-full transition-colors",
                step === 1 ? "bg-[#DC2626]" : "bg-[#DC2626]/40"
              )}
            />
            <div
              className={cn(
                "h-2 w-8 rounded-full transition-colors",
                step === 2 ? "bg-[#7C3AED]" : "bg-[#7C3AED]/40"
              )}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-8">
        {step === 1 && (
          <div className="mx-auto max-w-md space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <label className="mb-2 block text-sm font-medium text-white/70">
                Nome do grupo
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ex: Casa, Viagem, Casal..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition-colors focus:border-[#DC2626]/50 focus:ring-1 focus:ring-[#DC2626]/30"
                autoFocus
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <label className="mb-2 block text-sm font-medium text-white/70">
                Moeda padrao
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/30"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-[#0F0A1A]">
                    {c.symbol} {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#DC2626] to-[#7C3AED] px-6 py-3.5 font-semibold text-white transition-opacity disabled:opacity-40"
            >
              Proximo
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="mx-auto max-w-md space-y-6">
            {/* Add member input */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <label className="mb-2 block text-sm font-medium text-white/70">
                Adicionar membro
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nome do membro"
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition-colors focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/30"
                  autoFocus
                />
                <button
                  onClick={handleAddMember}
                  disabled={!newMemberName.trim()}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED] text-white transition-opacity disabled:opacity-40"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Members list */}
            {members.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <Users className="h-4 w-4 text-white/50" />
                  <span className="text-sm font-medium text-white/50">
                    {members.length} membro{members.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-2">
                  {members.map((member, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5"
                    >
                      <MemberAvatar
                        name={member.name}
                        color={member.avatar_color}
                        size="sm"
                      />
                      <span className="flex-1 text-sm font-medium text-white">
                        {member.name}
                        {member.isMe && (
                          <span className="ml-2 text-xs text-primary">(voce)</span>
                        )}
                      </span>
                      {!member.isMe && (
                        <button
                          onClick={() => handleRemoveMember(index)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-red-500/20 hover:text-[#DC2626]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {members.length < 2 && (
              <p className="text-center text-sm text-white/40">
                Adicione pelo menos mais 1 membro para continuar
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="rounded-xl border border-white/10 px-5 py-3.5 font-medium text-white/70 transition-colors hover:bg-white/5"
              >
                Voltar
              </button>
              <button
                onClick={handleFinish}
                disabled={!canFinish || saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#DC2626] to-[#7C3AED] px-6 py-3.5 font-semibold text-white transition-opacity disabled:opacity-40"
              >
                {saving ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <Heart className="h-4 w-4" />
                    Comecar
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
