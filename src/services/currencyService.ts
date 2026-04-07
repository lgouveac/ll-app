import { supabase } from "@/integrations/supabase/client";


async function fetchRateForDate(
  from: string,
  to: string,
  date: string
): Promise<number> {
  // Check cache first
  const { data: cached } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("base_currency", from)
    .eq("target_currency", to)
    .eq("fetched_at", date)
    .maybeSingle();

  if (cached) return Number(cached.rate);

  // Fetch via Vercel API route (same-origin, no CORS issues)
  const response = await fetch("/api/exchange-rate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, date }),
  });

  if (!response.ok) throw new Error(`Failed to fetch rate for ${from} -> ${to}`);

  const fnData = await response.json();
  const rate = fnData?.rate;
  if (!rate) throw new Error(`Rate not found for ${from} -> ${to} on ${date}`);

  // Cache in Supabase
  await supabase.from("exchange_rates").upsert(
    {
      base_currency: from,
      target_currency: to,
      rate,
      fetched_at: date,
    },
    { onConflict: "base_currency,target_currency,fetched_at" }
  );

  return rate;
}

/**
 * Convert amount using the exchange rate for a specific date
 */
export async function convertAmountForDate(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  date: string
): Promise<{ converted: number; rate: number }> {
  if (fromCurrency === toCurrency) {
    return { converted: amount, rate: 1 };
  }

  const rate = await fetchRateForDate(fromCurrency, toCurrency, date);

  return {
    converted: Math.round(amount * rate * 100) / 100,
    rate,
  };
}

/**
 * Convert amount using today's rate (for live preview in CurrencySelector)
 */
export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<{ converted: number; rate: number }> {
  const today = new Date().toISOString().split("T")[0];
  return convertAmountForDate(amount, fromCurrency, toCurrency, today);
}
