import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useGroup } from "@/hooks/useGroup";

interface GroupGuardProps {
  children: ReactNode;
}

export default function GroupGuard({ children }: GroupGuardProps) {
  const { group, loading } = useGroup();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
}
