import { supabase } from "@/integrations/supabase/client";
import type { Invitation } from "@/types/group";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

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
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Convite ja enviado para este email neste grupo");
    }
    throw error;
  }

  // Send email via Edge Function (fire and forget)
  sendInviteEmail(data.id).catch((err) =>
    console.warn("Failed to send invite email:", err)
  );

  return data;
}

async function sendInviteEmail(invitationId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ invitation_id: invitationId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).error || "Email send failed");
  }
}

export async function acceptInvitation(invitationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get the invitation
  const { data: invitation, error: fetchError } = await supabase
    .from("invitations")
    .select("*")
    .eq("id", invitationId)
    .single();

  if (fetchError) throw fetchError;

  // Update invitation status
  const { error: updateError } = await supabase
    .from("invitations")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", invitationId);

  if (updateError) throw updateError;

  // Link the member to this user account
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
