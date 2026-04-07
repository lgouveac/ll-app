import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

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
    const { from, to, date } = await req.json();
    if (!from || !to) return json({ error: "from and to are required" }, 400);

    const endpoint = date || "latest";
    const url = `https://api.frankfurter.app/${endpoint}?from=${from}&to=${to}`;

    let response = await fetch(url);

    // Fallback to latest if historical date fails
    if (!response.ok && date) {
      response = await fetch(
        `https://api.frankfurter.app/latest?from=${from}&to=${to}`
      );
    }

    if (!response.ok) {
      return json({ error: `Failed to fetch rate for ${from} -> ${to}` }, 502);
    }

    const data_json = await response.json();
    const rate = data_json.rates?.[to];

    if (!rate) {
      return json({ error: `Rate not found for ${from} -> ${to}` }, 404);
    }

    return json({ rate, date: data_json.date });
  } catch (err) {
    console.error("Exchange rate error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
