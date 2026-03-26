import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Heart, Loader2, Mail, Lock, ArrowRight, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { acceptInvitation } from "@/services/invitationService";
import { cn } from "@/lib/utils";

const authSchema = z.object({
  email: z.string().email("E-mail invalido"),
  password: z.string().min(6, "Minimo de 6 caracteres"),
});

type AuthFormValues = z.infer<typeof authSchema>;

export default function Auth() {
  const [searchParams] = useSearchParams();
  const inviteId = searchParams.get("invite");

  const [isSignUp, setIsSignUp] = useState(!!inviteId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  // If user is already logged in and has an invite, accept it
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
      toast.success("Convite aceito! Bem-vindo ao grupo.");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao aceitar convite"
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
    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const result = await signUp(data.email, data.password);

        if (result.session) {
          // Auto-confirmed — user is logged in
          toast.success("Conta criada!");
          // useEffect handles invite acceptance and navigation
          if (!inviteId) navigate("/", { replace: true });
        } else {
          // Email confirmation required
          toast.success(
            "Conta criada! Verifique seu e-mail para confirmar."
          );
        }
      } else {
        await signIn(data.email, data.password);
        toast.success("Bem-vindo de volta!");
        // useEffect handles invite acceptance and navigation
        if (!inviteId) navigate("/", { replace: true });
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Erro inesperado";

      // Better error messages in Portuguese
      if (message.includes("Invalid login credentials")) {
        toast.error("Email ou senha incorretos");
      } else if (message.includes("Email not confirmed")) {
        toast.error("Confirme seu email antes de entrar. Verifique sua caixa de entrada.");
      } else if (message.includes("User already registered")) {
        toast.error("Este email ja esta cadastrado. Tente entrar.");
        setIsSignUp(false);
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
            L&L
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Split with Love
          </p>
        </div>

        {/* Invite banner */}
        {inviteId && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3">
            <UserPlus className="h-5 w-5 shrink-0 text-secondary" />
            <p className="text-sm text-foreground">
              Voce recebeu um convite! {isSignUp ? "Crie uma conta" : "Entre"} para aceitar.
            </p>
          </div>
        )}

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xl shadow-black/20">
          <h2 className="mb-6 text-center text-lg font-semibold text-foreground">
            {isSignUp ? "Criar conta" : "Entrar"}
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                E-mail
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
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
                Senha
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder="••••••"
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
                  {isSignUp ? "Criar conta" : "Entrar"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp((prev) => !prev)}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {isSignUp
                ? "Ja tem uma conta? Entrar"
                : "Nao tem conta? Criar conta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
