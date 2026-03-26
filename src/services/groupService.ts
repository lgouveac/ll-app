import { supabase } from "@/integrations/supabase/client";
import type { Group } from "@/types/group";

export async function getGroup(): Promise<Group | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // First try: groups I own
  const { data: ownGroup } = await supabase
    .from("groups")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (ownGroup) return ownGroup;

  // Second try: groups I'm a member of (via accepted invite)
  const { data: memberOf } = await supabase
    .from("members")
    .select("group_id, groups(*)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (memberOf?.groups) {
    // groups comes as object since it's a single FK relation
    return memberOf.groups as unknown as Group;
  }

  return null;
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
