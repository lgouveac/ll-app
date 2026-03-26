import { Link } from "react-router-dom";
import { HeartCrack } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 rounded-full gradient-romantic-subtle flex items-center justify-center mb-6">
        <HeartCrack className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Pagina nao encontrada</h1>
      <p className="text-muted-foreground mb-8">
        Parece que essa pagina nao existe.
      </p>
      <Link
        to="/"
        className="px-6 py-3 rounded-lg gradient-romantic text-white font-medium"
      >
        Voltar ao inicio
      </Link>
    </div>
  );
}
