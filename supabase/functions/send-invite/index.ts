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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { invitation_id } = await req.json();
    if (!invitation_id) {
      return new Response(
        JSON.stringify({ error: "invitation_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch invitation
    const { data: invitation, error: invError } = await supabase
      .from("invitations")
      .select("*, group:groups(name), member:members(name)")
      .eq("id", invitation_id)
      .single();

    if (invError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Invitation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const redirectTo = `${APP_URL}/auth?invite=${invitation_id}`;

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === invitation.email.toLowerCase()
    );

    if (existingUser) {
      // User exists — send a magic link so they can log in and accept
      const { error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: invitation.email,
        options: { redirectTo },
      });

      if (linkError) {
        console.error("Magic link error:", linkError);
        // Not fatal — user can still log in manually
        return new Response(
          JSON.stringify({
            success: true,
            method: "existing_user",
            note: "User already exists. They can log in and accept at /invitations",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, method: "magic_link" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // New user — send Supabase invite email
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      invitation.email,
      { redirectTo }
    );

    if (inviteError) {
      console.error("Invite error:", inviteError);
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, method: "invite_email" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
