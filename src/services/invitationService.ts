import { supabase } from "@/integrations/supabase/client";
import type { Invitation } from "@/types/group";
import { sendInviteEmail } from "./emailService";

export async function getMyInvitations(): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from("invitations")
    .select(`
      *,
      group:groups(id, name, default_currency),
      member:members(id, name, avatar_color)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function sendInvitation(
  groupId: string,
  memberId: string,
  email: string
): Promise<Invitation> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("invitations")
    .insert({
      group_id: groupId,
      member_id: memberId,
      email: email.toLowerCase().trim(),
      invited_by: user.id,
    })
    .select(`
      *,
      group:groups(id, name),
      member:members(id, name)
    `)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Convite ja enviado para este email neste grupo");
    }
    throw error;
  }

  // Send email via Resend (fire and forget)
  const inviterName = user.email?.split("@")[0] || "Alguem";
  const groupName = (data.group as unknown as { name: string })?.name || "um grupo";
  const memberName = (data.member as unknown as { name: string })?.name || "membro";

  sendInviteEmail({
    to: email.toLowerCase().trim(),
    inviterName,
    groupName,
    memberName,
    invitationId: data.id,
  }).catch((err) => console.warn("Failed to send invite email:", err));

  return data;
}

export async function acceptInvitation(invitationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: invitation, error: fetchError } = await supabase
    .from("invitations")
    .select("*")
    .eq("id", invitationId)
    .single();

  if (fetchError) throw fetchError;

  const { error: updateError } = await supabase
    .from("invitations")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", invitationId);

  if (updateError) throw updateError;

  const { error: memberError } = await supabase
    .from("members")
    .update({ user_id: user.id, email: user.email })
    .eq("id", invitation.member_id);

  if (memberError) throw memberError;
}

export async function declineInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from("invitations")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", invitationId);

  if (error) throw error;
}
