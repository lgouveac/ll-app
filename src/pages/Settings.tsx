import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Settings as SettingsIcon, Users, LogOut, Save, Mail, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useGroup } from "@/hooks/useGroup";
import { updateGroup } from "@/services/groupService";
import { CURRENCIES } from "@/types/expense";

export default function Settings() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { group, refetch } = useGroup();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setCurrency(group.default_currency);
    }
  }, [group]);

  const isDirty =
    group != null &&
    (name.trim() !== group.name || currency !== group.default_currency);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateGroup(group!.id, {
        name: name.trim(),
        default_currency: currency,
      }),
    onSuccess: () => {
      toast.success("Configuracoes salvas!");
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao salvar");
    },
  });

  async function handleSignOut() {
    if (!window.confirm("Tem certeza que deseja sair?")) return;
    setSigningOut(true);
    try {
      await signOut();
      navigate("/auth", { replace: true });
    } catch (error) {
      toast.error("Erro ao sair");
      setSigningOut(false);
    }
  }

  if (!group) return null;

  return (
    <div className="min-h-screen bg-[#0F0A1A] px-4 pb-8 pt-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#DC2626]/20 to-[#7C3AED]/20">
          <SettingsIcon className="h-5 w-5 text-white/70" />
        </div>
        <h1 className="text-xl font-bold text-white">Configuracoes</h1>
      </div>

      <div className="mx-auto max-w-md space-y-6">
        {/* Group settings card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/40">
            Grupo
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/70">
                Nome do grupo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition-colors focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/70">
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
          </div>

          {/* Save button */}
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!isDirty || !name.trim() || saveMutation.isPending}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#DC2626] to-[#7C3AED] px-6 py-3 font-semibold text-white transition-opacity disabled:opacity-40"
          >
            {saveMutation.isPending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar alteracoes
              </>
            )}
          </button>
        </div>

        {/* Navigation links */}
        <div className="space-y-2">
          <button
            onClick={() => navigate("/members")}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/[0.08]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7C3AED]/20">
              <Users className="h-5 w-5 text-[#7C3AED]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Gerenciar membros</p>
              <p className="text-xs text-white/40">Adicionar, editar ou desativar</p>
            </div>
            <ChevronRight className="h-5 w-5 text-white/30" />
          </button>

          <button
            onClick={() => navigate("/invitations")}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/[0.08]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DC2626]/20">
              <Mail className="h-5 w-5 text-[#DC2626]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Convites</p>
              <p className="text-xs text-white/40">Ver convites pendentes</p>
            </div>
            <ChevronRight className="h-5 w-5 text-white/30" />
          </button>
        </div>

        {/* Sign out */}
        <div className="pt-4">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 px-6 py-3 font-medium text-[#DC2626] transition-colors hover:bg-[#DC2626]/20 disabled:opacity-40"
          >
            {signingOut ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#DC2626]/30 border-t-[#DC2626]" />
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                Sair da conta
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
