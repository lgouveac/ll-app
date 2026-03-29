import { supabase } from "@/integrations/supabase/client";

export interface Tip {
  title: string;
  description: string;
  url: string | null;
  type: "tip" | "coupon" | "cashback";
}

export async function getCachedTips(groupId: string): Promise<Tip[] | null> {
  const { data } = await supabase
    .from("group_tips")
    .select("tips, fetched_at")
    .eq("group_id", groupId)
    .maybeSingle();

  if (!data) return null;

  // Cache for 24h
  const fetched = new Date(data.fetched_at);
  const now = new Date();
  if (now.getTime() - fetched.getTime() > 24 * 60 * 60 * 1000) return null;

  return data.tips as Tip[];
}

export async function fetchAndCacheTips(
  groupId: string,
  groupType: string,
  currency: string,
  locale: string
): Promise<Tip[]> {
  const res = await fetch("/api/get-tips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupType, currency, locale }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).error || "Failed to fetch tips");
  }

  const { tips, query } = await res.json();

  // Upsert cache
  await supabase.from("group_tips").upsert(
    {
      group_id: groupId,
      tips,
      query,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "group_id" }
  );

  return tips as Tip[];
}
