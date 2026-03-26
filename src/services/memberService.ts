import { supabase } from "@/integrations/supabase/client";
import type { Member } from "@/types/group";
import { getAvatarColor } from "@/lib/utils";

export async function getMembers(groupId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .order("created_at");

  if (error) throw error;
  return data ?? [];
}

export async function getAllMembers(groupId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at");

  if (error) throw error;
  return data ?? [];
}

export async function addMember(
  groupId: string,
  name: string,
  colorIndex: number,
  userId?: string,
  email?: string
): Promise<Member> {
  const row: Record<string, unknown> = {
    group_id: groupId,
    name,
    avatar_color: getAvatarColor(colorIndex),
  };
  if (userId) row.user_id = userId;
  if (email) row.email = email;

  const { data, error } = await supabase
    .from("members")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMember(id: string, updates: Partial<Pick<Member, "name" | "avatar_color">>): Promise<Member> {
  const { data, error } = await supabase
    .from("members")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deactivateMember(id: string): Promise<void> {
  const { error } = await supabase
    .from("members")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
}

export async function reactivateMember(id: string): Promise<void> {
  const { error } = await supabase
    .from("members")
    .update({ is_active: true })
    .eq("id", id);

  if (error) throw error;
}
