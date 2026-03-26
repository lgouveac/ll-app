import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { getGroup } from "@/services/groupService";
import { getMembers } from "@/services/memberService";
import type { Group, Member } from "@/types/group";

interface GroupContextType {
  group: Group | null;
  members: Member[];
  loading: boolean;
  refetch: () => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["group", user?.id],
    queryFn: getGroup,
    enabled: !!user,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["members", group?.id],
    queryFn: () => getMembers(group!.id),
    enabled: !!group,
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["group"] });
    queryClient.invalidateQueries({ queryKey: ["members"] });
  };

  return (
    <GroupContext.Provider
      value={{
        group: group ?? null,
        members,
        loading: groupLoading || membersLoading,
        refetch,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const context = useContext(GroupContext);
  if (!context) throw new Error("useGroup must be used within GroupProvider");
  return context;
}
