import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Settings as SettingsIcon, Users, Save, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useGroup } from "@/hooks/useGroup";
import { updateGroup } from "@/services/groupService";
import { CURRENCIES } from "@/types/expense";

export default function Settings() {
  const navigate = useNavigate();
  const { group, refetch } = useGroup();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [budget, setBudget] = useState<string>("");

  useEffect(() => {
    if (group) {
      setName(group.name);
      setCurrency(group.default_currency);
      setBudget(group.budget != null ? String(group.budget) : "");
    }
  }, [group]);

  const budgetNum = budget ? Number(budget) : null;
  const isDirty =
    group != null &&
    (name.trim() !== group.name || currency !== group.default_currency || budgetNum !== group.budget);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateGroup(group!.id, {
        name: name.trim(),
        default_currency: currency,
        budget: budgetNum,
      }),
    onSuccess: () => {
      toast.success("Configuracoes salvas!");
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao salvar");
    },
  });

  if (!group) return null;

  return (
    <div className="space-y-6 pt-2">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-secondary/20">
          <SettingsIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold">Config do grupo</h1>
      </div>

      {/* Group settings */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Nome do grupo
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-secondary"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Moeda padrao
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full appearance-none rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-secondary"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Limite de gasto ({currency})
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Sem limite se vazio"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-secondary"
          />
        </div>

        <button
          onClick={() => saveMutation.mutate()}
          disabled={!isDirty || !name.trim() || saveMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-6 py-3 font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {saveMutation.isPending ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar
            </>
          )}
        </button>
      </div>

      {/* Members link */}
      <button
        onClick={() => navigate("/members")}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/20">
          <Users className="h-5 w-5 text-secondary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Gerenciar membros</p>
          <p className="text-xs text-muted-foreground">Adicionar, editar ou remover</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </button>
    </div>
  );
}
