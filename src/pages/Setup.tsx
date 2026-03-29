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
import { useI18n } from "@/hooks/useI18n";
import MemberAvatar from "@/components/members/MemberAvatar";

interface PendingMember {
  name: string;
  email: string;
  avatar_color: string;
  isMe: boolean;
}

export default function Setup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useI18n();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [groupName, setGroupName] = useState("");
  const [myName, setMyName] = useState(user?.email?.split("@")[0] || "");
  const [currency, setCurrency] = useState("BRL");
  const [members, setMembers] = useState<PendingMember[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const canProceedStep1 = groupName.trim().length > 0;
  const canProceedStep2 = myName.trim().length > 0;
  const canFinish = members.length >= 1; // At least 1 other person + you

  function handleAddMember() {
    const trimmed = newMemberName.trim();
    if (!trimmed) return;
    const allNames = [myName, ...members.map((m) => m.name)];
    if (allNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(t("setup.duplicateName"));
      return;
    }
    setMembers((prev) => [
      ...prev,
      {
        name: trimmed,
        email: newMemberEmail.trim(),
        avatar_color: getAvatarColor(prev.length + 1),
        isMe: false,
      },
    ]);
    setNewMemberName("");
    setNewMemberEmail("");
  }

  function handleRemoveMember(index: number) {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (step === 1 && canProceedStep1) setStep(2);
      else if (step === 2 && canProceedStep2) setStep(3);
      else if (step === 3 && newMemberName.trim()) handleAddMember();
    }
  }

  async function handleFinish() {
    if (!canFinish) return;
    setSaving(true);

    try {
      // Get fresh user data FIRST to guarantee we have the ID
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user: freshUser }, error: userError } = await supabase.auth.getUser();

      if (!freshUser || userError) {
        toast.error(t("setup.sessionExpired"));
        navigate("/auth", { replace: true });
        return;
      }

      console.log("[Setup] User ID:", freshUser.id, "Email:", freshUser.email);

      const group = await createGroup(groupName.trim(), currency);
      console.log("[Setup] Group created:", group.id);

      // Add myself first (linked to my user account)
      await addMember(group.id, myName.trim(), 0, freshUser.id, freshUser.email ?? undefined);
      console.log("[Setup] Self member created with user_id:", freshUser.id);

      // Add other members
      await Promise.all(
        members.map((m, i) => addMember(group.id, m.name, i + 1, undefined, m.email || undefined))
      );

      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      await queryClient.invalidateQueries({ queryKey: ["group"] });
      await queryClient.invalidateQueries({ queryKey: ["members"] });

      toast.success(t("setup.groupCreated"));
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("setup.groupError")
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
          <h1 className="text-2xl font-bold text-white">{t("setup.title")}</h1>
          <p className="mt-2 text-sm text-white/60">
            {step === 1 && t("setup.step1")}
            {step === 2 && t("setup.step2")}
            {step === 3 && t("setup.step3")}
          </p>

          {/* Step indicator */}
          <div className="mt-6 flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-2 w-6 rounded-full transition-colors",
                  step >= s ? (s <= 1 ? "bg-[#DC2626]" : s === 2 ? "bg-[#9333EA]" : "bg-[#7C3AED]") : "bg-white/20"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-8">
        {/* Step 1: Group name + currency */}
        {step === 1 && (
          <div className="mx-auto max-w-md space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <label className="mb-2 block text-sm font-medium text-white/70">
                {t("setup.groupName")}
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("setup.groupNamePlaceholder")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition-colors focus:border-[#DC2626]/50"
                autoFocus
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <label className="mb-2 block text-sm font-medium text-white/70">
                {t("setup.defaultCurrency")}
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
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
              {t("common.next")} <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Step 2: Your name */}
        {step === 2 && (
          <div className="mx-auto max-w-md space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <label className="mb-2 block text-sm font-medium text-white/70">
                {t("setup.yourName")}
              </label>
              <div className="flex items-center gap-3">
                <MemberAvatar name={myName || "?"} color={getAvatarColor(0)} size="md" />
                <input
                  type="text"
                  value={myName}
                  onChange={(e) => setMyName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("setup.yourNamePlaceholder")}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition-colors focus:border-[#7C3AED]/50"
                  autoFocus
                />
              </div>
              <p className="mt-2 text-xs text-white/40">
                Email: {user?.email}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="rounded-xl border border-white/10 px-5 py-3.5 font-medium text-white/70 hover:bg-white/5"
              >
                {t("common.back")}
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#DC2626] to-[#7C3AED] px-6 py-3.5 font-semibold text-white transition-opacity disabled:opacity-40"
              >
                {t("common.next")} <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Add other members */}
        {step === 3 && (
          <div className="mx-auto max-w-md space-y-6">
            {/* Add member input */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <label className="mb-2 block text-sm font-medium text-white/70">
                {t("setup.addMember")}
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("setup.namePlaceholder")}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#7C3AED]/50"
                  autoFocus
                />
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("setup.emailPlaceholder")}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#7C3AED]/50"
                />
                <button
                  onClick={handleAddMember}
                  disabled={!newMemberName.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  {t("common.add")}
                </button>
              </div>
            </div>

            {/* Members list (me + others) */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-2 px-1">
                <Users className="h-4 w-4 text-white/50" />
                <span className="text-sm font-medium text-white/50">
                  {members.length > 0 ? t("setup.membersCount", { count: members.length + 1 }) : t("setup.memberCount", { count: 1 })}
                </span>
              </div>
              <div className="space-y-2">
                {/* Me - always first, can't remove */}
                <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
                  <MemberAvatar name={myName} color={getAvatarColor(0)} size="sm" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-white">
                      {myName} <span className="text-xs text-primary">({t("common.you")})</span>
                    </span>
                    <p className="text-xs text-white/40">{user?.email}</p>
                  </div>
                </div>

                {/* Other members */}
                {members.map((member, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5"
                  >
                    <MemberAvatar name={member.name} color={member.avatar_color} size="sm" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-white">{member.name}</span>
                      {member.email && (
                        <p className="text-xs text-white/40">{member.email}</p>
                      )}
                      {!member.email && (
                        <p className="text-xs text-white/30">{t("setup.noEmail")}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveMember(index)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 hover:bg-red-500/20 hover:text-[#DC2626]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {members.length < 1 && (
              <p className="text-center text-sm text-white/40">
                {t("setup.addMore")}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="rounded-xl border border-white/10 px-5 py-3.5 font-medium text-white/70 hover:bg-white/5"
              >
                {t("common.back")}
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
                    {t("setup.createGroup")}
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
