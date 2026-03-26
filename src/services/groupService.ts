import { supabase } from "@/integrations/supabase/client";
import type { Group } from "@/types/group";

export async function getGroups(): Promise<Group[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Groups I own
  const { data: ownGroups } = await supabase
    .from("groups")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at");

  // Groups I'm a member of
  const { data: memberGroups } = await supabase
    .from("members")
    .select("groups(*)")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const fromMembership = (memberGroups ?? [])
    .map((m) => m.groups as unknown as Group)
    .filter(Boolean);

  // Merge and deduplicate
  const all = [...(ownGroups ?? []), ...fromMembership];
  const unique = Array.from(new Map(all.map((g) => [g.id, g])).values());

  return unique;
}

export async function getGroup(id: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createGroup(name: string, defaultCurrency: string): Promise<Group> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("groups")
    .insert({ name, default_currency: defaultCurrency, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGroup(id: string, updates: Partial<Pick<Group, "name" | "default_currency">>): Promise<Group> {
  const { data, error } = await supabase
    .from("groups")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGroup(id: string): Promise<void> {
  const { error } = await supabase.from("groups").delete().eq("id", id);
  if (error) throw error;
}
