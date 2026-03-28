import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, LogOut, Inbox, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function AccountSettings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const email = user?.email ?? "";
  const displayName = email.split("@")[0];

  async function handleSignOut() {
    if (!window.confirm("Tem certeza que deseja sair?")) return;
    setSigningOut(true);
    try {
      await signOut();
      navigate("/auth", { replace: true });
    } catch {
      toast.error("Erro ao sair");
      setSigningOut(false);
    }
  }

  return (
    <div className="space-y-6 pt-2">
      <h1 className="text-xl font-bold">Minha conta</h1>

      {/* Profile info */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full gradient-romantic">
            <User className="h-7 w-7 text-white" />
          </div>
          <div>
            <p className="text-lg font-semibold">{displayName}</p>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              {email}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="space-y-2">
        <button
          onClick={() => navigate("/invitations")}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
            <Inbox className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Convites pendentes</p>
            <p className="text-xs text-muted-foreground">Ver e aceitar convites de grupos</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Sign out */}
      <div className="pt-4">
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-6 py-3 font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-40"
        >
          {signingOut ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-destructive/30 border-t-destructive" />
          ) : (
            <>
              <LogOut className="h-4 w-4" />
              Sair da conta
            </>
          )}
        </button>
      </div>
    </div>
  );
}
