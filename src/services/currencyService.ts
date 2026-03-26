import { supabase } from "@/integrations/supabase/client";

interface RatesResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
}

export async function fetchExchangeRates(baseCurrency: string): Promise<Record<string, number>> {
  const today = new Date().toISOString().split("T")[0];

  // Check cache first
  const { data: cached } = await supabase
    .from("exchange_rates")
    .select("target_currency, rate")
    .eq("base_currency", baseCurrency)
    .eq("fetched_at", today);

  if (cached && cached.length > 0) {
    const rates: Record<string, number> = {};
    for (const row of cached) {
      rates[row.target_currency] = Number(row.rate);
    }
    return rates;
  }

  // Fetch from API
  const response = await fetch(
    `https://open.er-api.com/v6/latest/${baseCurrency}`
  );

  if (!response.ok) throw new Error("Failed to fetch exchange rates");

  const json: RatesResponse = await response.json();
  if (json.result !== "success") throw new Error("Exchange rate API error");

  // Cache the rates
  const rows = Object.entries(json.rates).map(([target, rate]) => ({
    base_currency: baseCurrency,
    target_currency: target,
    rate,
    fetched_at: today,
  }));

  // Upsert in chunks to avoid hitting limits
  const chunkSize = 50;
  for (let i = 0; i < rows.length; i += chunkSize) {
    await supabase
      .from("exchange_rates")
      .upsert(rows.slice(i, i + chunkSize), {
        onConflict: "base_currency,target_currency,fetched_at",
      });
  }

  return json.rates;
}

export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<{ converted: number; rate: number }> {
  if (fromCurrency === toCurrency) {
    return { converted: amount, rate: 1 };
  }

  const rates = await fetchExchangeRates(fromCurrency);
  const rate = rates[toCurrency];

  if (!rate) throw new Error(`Rate not found for ${fromCurrency} -> ${toCurrency}`);

  return {
    converted: Math.round(amount * rate * 100) / 100,
    rate,
  };
}
