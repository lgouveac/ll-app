import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { groupType, currency, locale } = req.body;
  if (!groupType) return res.status(400).json({ error: "groupType required" });

  const TAVILY_KEY = process.env.TAVILY_API_KEY;
  const OPENAI_KEY = process.env.VITE_OPENAI_API_KEY;
  if (!TAVILY_KEY) return res.status(500).json({ error: "TAVILY_API_KEY not configured" });
  if (!OPENAI_KEY) return res.status(500).json({ error: "OPENAI_API_KEY not configured" });

  try {
    // 1. Search with Tavily
    const langMap: Record<string, string> = { pt: "portugues", en: "english", de: "deutsch", es: "espanol", it: "italiano" };
    const lang = langMap[locale] || "english";
    const searchQuery = `dicas economizar cupons desconto cashback ${groupType} ${currency || ""} 2026`;

    const tavilyRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query: searchQuery,
        max_results: 8,
        search_depth: "basic",
      }),
    });

    if (!tavilyRes.ok) {
      const err = await tavilyRes.json().catch(() => ({}));
      return res.status(500).json({ error: "Tavily search failed", details: err });
    }

    const tavilyData = await tavilyRes.json();
    const searchResults = (tavilyData.results || [])
      .map((r: { title: string; url: string; content: string }) => `- ${r.title}\n  ${r.url}\n  ${r.content?.substring(0, 300)}`)
      .join("\n\n");

    // 2. GPT organizes results
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a smart savings advisor. Given web search results about a "${groupType}" expense group using ${currency || "USD"} currency, create exactly 5 practical tips.

Return ONLY valid JSON array:
[
  {
    "title": "Short title",
    "description": "1-2 sentence practical tip",
    "url": "source URL if available, null if not",
    "type": "tip" | "coupon" | "cashback"
  }
]

Rules:
- Respond in ${lang}
- type "coupon" = discount codes or promo links found in results
- type "cashback" = cashback apps or programs
- type "tip" = general saving advice
- Only include URLs from the search results, never invent URLs
- Make descriptions actionable and specific
- If search results are poor, give general advice for "${groupType}" groups`,
          },
          {
            role: "user",
            content: `Search results:\n\n${searchResults}\n\nCreate 5 tips for a "${groupType}" group:`,
          },
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
    });

    if (!gptRes.ok) {
      return res.status(500).json({ error: "GPT processing failed" });
    }

    const gptData = await gptRes.json();
    const content = gptData.choices?.[0]?.message?.content?.trim() || "[]";
    const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const tips = JSON.parse(jsonStr);

    return res.status(200).json({ tips, query: searchQuery });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
