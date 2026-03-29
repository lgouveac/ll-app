import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Heart,
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  UserPlus,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { acceptInvitation } from "@/services/invitationService";
import { cn } from "@/lib/utils";

const authSchema = z.object({
  email: z.string().email("E-mail invalido"),
  password: z.string().min(6, "Minimo de 6 caracteres"),
});

type AuthFormValues = z.infer<typeof authSchema>;

type AuthState = "form" | "check-email";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const inviteId = searchParams.get("invite");

  const [mode, setMode] = useState<"login" | "signup">(inviteId ? "signup" : "login");
  const [authState, setAuthState] = useState<AuthState>("form");
  const [pendingEmail, setPendingEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { signIn, signUp, resendConfirmation, user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  // If user is already logged in
  useEffect(() => {
    if (user && inviteId) {
      handleAcceptInvite(inviteId);
    } else if (user && !inviteId) {
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, inviteId]);

  async function handleAcceptInvite(id: string) {
    try {
      await acceptInvitation(id);
      toast.success(t("auth.inviteAccepted"));
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("auth.inviteError")
      );
      navigate("/", { replace: true });
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: AuthFormValues) => {
    console.log("[Auth] Mode:", mode, "| Email:", data.email);
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        console.log("[Auth] Calling signUp...");
        const result = await signUp(data.email, data.password);
        console.log("[Auth] signUp result:", { user: !!result.user, session: !!result.session });

        if (result.session) {
          toast.success(t("auth.accountCreated"));
          if (!inviteId) navigate("/", { replace: true });
        } else {
          // Email confirmation required — show check-email screen
          setPendingEmail(data.email);
          setAuthState("check-email");
        }
      } else {
        console.log("[Auth] Calling signIn...");
        await signIn(data.email, data.password);
        console.log("[Auth] signIn success");
        toast.success(t("auth.welcomeBack"));
        if (!inviteId) navigate("/", { replace: true });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      console.error("[Auth] Error:", message);

      if (message.includes("Invalid login credentials")) {
        toast.error(t("auth.wrongCredentials"));
      } else if (message.includes("Email not confirmed")) {
        toast.error(t("auth.confirmFirst"));
        setPendingEmail(data.email);
        setAuthState("check-email");
      } else if (message.includes("User already registered")) {
        toast.error(t("auth.alreadyRegistered"));
        setMode("login");
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    setIsResending(true);
    try {
      await resendConfirmation(pendingEmail);
      toast.success(t("auth.emailResent"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao reenviar"
      );
    } finally {
      setIsResending(false);
    }
  };

  // Check-email screen
  if (authState === "check-email") {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="pointer-events-none absolute inset-0 gradient-romantic-subtle" />
        <div className="relative z-10 w-full max-w-sm text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            {t("auth.checkEmail")}
          </h1>
          <p className="mb-2 text-muted-foreground">
            {t("auth.checkEmailSent")}
          </p>
          <p className="mb-6 font-medium text-foreground">{pendingEmail}</p>
          <p className="mb-8 text-sm text-muted-foreground">
            {t("auth.checkEmailInstruction")}
          </p>

          <div className="space-y-3">
            <button
              onClick={handleResend}
              disabled={isResending}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-card disabled:opacity-50"
            >
              {isResending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t("auth.resendEmail")}
            </button>

            <button
              onClick={() => {
                setAuthState("form");
                setMode("login");
              }}
              className="gradient-romantic flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium text-white"
            >
              {t("auth.alreadyConfirmed")}
            </button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            {t("auth.checkSpam")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 gradient-romantic-subtle" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Branding */}
        <div className="mb-8 flex flex-col items-center">
          <div className="gradient-romantic mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg shadow-primary/20">
            <Heart className="h-7 w-7 text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t("auth.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("auth.subtitle")}
          </p>
        </div>

        {/* Invite banner */}
        {inviteId && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3">
            <UserPlus className="h-5 w-5 shrink-0 text-secondary" />
            <p className="text-sm text-foreground">
              {mode === "signup" ? t("auth.inviteBanner.signup") : t("auth.inviteBanner.login")}
            </p>
          </div>
        )}

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xl shadow-black/20">
          {/* Tabs */}
          <div className="mb-6 flex rounded-lg bg-accent p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={cn(
                "flex-1 rounded-md py-2.5 text-sm font-medium transition-all",
                mode === "login"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("auth.login")}
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={cn(
                "flex-1 rounded-md py-2.5 text-sm font-medium transition-all",
                mode === "signup"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("auth.signup")}
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                {t("common.email")}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t("auth.emailPlaceholder")}
                  className={cn(
                    "h-11 w-full rounded-lg border border-input bg-accent pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground",
                    errors.email && "border-destructive",
                  )}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                {t("common.password")}
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder={t("auth.passwordPlaceholder")}
                  className={cn(
                    "h-11 w-full rounded-lg border border-input bg-accent pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground",
                    errors.password && "border-destructive",
                  )}
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="gradient-romantic flex h-11 w-full items-center justify-center gap-2 rounded-lg font-medium text-white shadow-lg shadow-primary/25 transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {mode === "signup" ? t("auth.signup") : t("auth.login")}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
