import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

export default function QuickAddButton() {
  return (
    <Link
      to="/add"
      className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full gradient-romantic shadow-lg shadow-primary/30 transition-transform active:scale-95 animate-pulse-subtle"
      aria-label="Adicionar despesa"
    >
      <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />

      <style>{`
        @keyframes pulse-subtle {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 3s ease-in-out infinite;
        }
      `}</style>
    </Link>
  );
}
