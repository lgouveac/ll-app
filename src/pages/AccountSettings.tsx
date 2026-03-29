import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, LogOut, Inbox, ChevronRight, Globe } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { type Locale, LOCALE_LABELS } from "@/i18n";

export default function AccountSettings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const [signingOut, setSigningOut] = useState(false);

  const email = user?.email ?? "";
  const displayName = email.split("@")[0];

  async function handleSignOut() {
    if (!window.confirm(t("account.signOutConfirm"))) return;
    setSigningOut(true);
    try {
      await signOut();
      navigate("/auth", { replace: true });
    } catch {
      toast.error(t("account.signOutError"));
      setSigningOut(false);
    }
  }

  return (
    <div className="space-y-6 pt-2">
      <h1 className="text-xl font-bold">{t("account.title")}</h1>

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

      {/* Language selector */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-3">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm font-medium">Idioma / Language</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(LOCALE_LABELS) as [Locale, string][]).map(([code, label]) => (
            <button
              key={code}
              onClick={() => setLocale(code)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                locale === code
                  ? "bg-gradient-to-r from-primary to-secondary text-white"
                  : "border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {label}
            </button>
          ))}
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
            <p className="text-sm font-medium">{t("account.invites")}</p>
            <p className="text-xs text-muted-foreground">{t("account.invitesDesc")}</p>
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
              {t("account.signOut")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
