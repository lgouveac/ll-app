import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "http://localhost:5173";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { invitation_id } = await req.json();
    if (!invitation_id) return json({ error: "invitation_id required" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch invitation with group and member info
    const { data: invitation, error: invError } = await supabase
      .from("invitations")
      .select("*, group:groups(name), member:members(name)")
      .eq("id", invitation_id)
      .single();

    if (invError || !invitation) return json({ error: "Invitation not found" }, 404);

    const redirectTo = `${APP_URL}/auth?invite=${invitation_id}`;
    const email = invitation.email.toLowerCase().trim();

    // Check if user already has an account
    const { data: { users } } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    // More reliable: try to get user by email
    let userExists = false;
    try {
      const allUsers = await supabase.auth.admin.listUsers();
      userExists = (allUsers.data?.users ?? []).some(
        (u) => u.email?.toLowerCase() === email
      );
    } catch {
      // Fallback: assume new user
    }

    if (userExists) {
      // User exists — they can log in normally and accept at /invitations
      // Try to send a magic link as a convenience
      try {
        await supabase.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo },
        });
      } catch {
        // Not critical
      }

      return json({
        success: true,
        method: "existing_user",
        message: "User already has an account. They can log in to accept.",
      });
    }

    // New user — send Supabase invite (creates account + sends email)
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      { redirectTo }
    );

    if (inviteError) {
      console.error("Invite error:", inviteError);
      return json({ error: inviteError.message }, 500);
    }

    return json({
      success: true,
      method: "invite_email",
      message: "Invite email sent to new user.",
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
