import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { getGroups, getGroup as fetchGroup } from "@/services/groupService";
import { getMembers } from "@/services/memberService";
import type { Group, Member } from "@/types/group";

const STORAGE_KEY = "ll_active_group";

interface GroupContextType {
  groups: Group[];
  group: Group | null;
  members: Member[];
  loading: boolean;
  setActiveGroup: (id: string) => void;
  refetch: () => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );

  // Fetch all groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["groups", user?.id],
    queryFn: getGroups,
    enabled: !!user,
  });

  // Determine which group is active
  const resolvedGroupId = activeGroupId && groups.some((g) => g.id === activeGroupId)
    ? activeGroupId
    : groups[0]?.id ?? null;

  // Fetch active group details
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["group", resolvedGroupId],
    queryFn: () => fetchGroup(resolvedGroupId!),
    enabled: !!resolvedGroupId,
  });

  // Fetch members of active group
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["members", resolvedGroupId],
    queryFn: () => getMembers(resolvedGroupId!),
    enabled: !!resolvedGroupId,
  });

  const setActiveGroup = useCallback((id: string) => {
    setActiveGroupId(id);
    localStorage.setItem(STORAGE_KEY, id);
    queryClient.invalidateQueries({ queryKey: ["group"] });
    queryClient.invalidateQueries({ queryKey: ["members"] });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  }, [queryClient]);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["groups"] });
    queryClient.invalidateQueries({ queryKey: ["group"] });
    queryClient.invalidateQueries({ queryKey: ["members"] });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  }, [queryClient]);

  return (
    <GroupContext.Provider
      value={{
        groups,
        group: group ?? null,
        members,
        loading: groupsLoading || groupLoading || membersLoading,
        setActiveGroup,
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
