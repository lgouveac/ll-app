import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { groupType, currency, locale, expenses } = req.body;
  if (!groupType) return res.status(400).json({ error: "groupType required" });

  const TAVILY_KEY = process.env.TAVILY_API_KEY;
  const OPENAI_KEY = process.env.VITE_OPENAI_API_KEY;
  if (!TAVILY_KEY) return res.status(500).json({ error: "TAVILY_API_KEY not configured" });
  if (!OPENAI_KEY) return res.status(500).json({ error: "OPENAI_API_KEY not configured" });

  try {
    // Build expense context for GPT
    let expenseContext = "";
    if (expenses && Array.isArray(expenses) && expenses.length > 0) {
      const byCategory: Record<string, number> = {};
      let total = 0;
      for (const e of expenses) {
        const cat = e.category || "other";
        const amt = e.converted_amount ?? e.amount ?? 0;
        byCategory[cat] = (byCategory[cat] || 0) + amt;
        total += amt;
      }
      const breakdown = Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => `${cat}: ${amt.toFixed(2)} ${currency} (${((amt / total) * 100).toFixed(0)}%)`)
        .join(", ");

      expenseContext = `\n\nGROUP SPENDING DATA:\n- Total spent: ${total.toFixed(2)} ${currency}\n- By category: ${breakdown}\n- Number of expenses: ${expenses.length}`;
    }

    // Multiple targeted searches
    const queries = [
      `cupons desconto promoções ${groupType} ${new Date().getFullYear()}`,
      `cashback apps rewards ${groupType} ${currency}`,
      `como economizar dicas específicas ${groupType}`,
    ];

    const allResults: string[] = [];

    for (const query of queries) {
      const tavilyRes = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: TAVILY_KEY,
          query,
          max_results: 5,
          search_depth: "advanced",
          include_answer: true,
        }),
      });

      if (tavilyRes.ok) {
        const data = await tavilyRes.json();
        if (data.answer) allResults.push(`ANSWER: ${data.answer}`);
        for (const r of data.results || []) {
          allResults.push(`- ${r.title}\n  ${r.url}\n  ${r.content?.substring(0, 400)}`);
        }
      }
    }

    const searchResults = allResults.join("\n\n");

    // GPT with detailed context
    const langMap: Record<string, string> = { pt: "portugues", en: "english", de: "deutsch", es: "espanol", it: "italiano" };
    const lang = langMap[locale] || "english";

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
            content: `You are an expert savings consultant analyzing a "${groupType}" expense group using ${currency} currency.${expenseContext}

Based on the web search results AND the group's actual spending data, create exactly 5 SPECIFIC and ACTIONABLE tips.

RULES:
- Respond in ${lang}
- Be SPECIFIC: mention exact store names, app names, website names, percentages found in search results
- If you found actual coupon codes or promo links, include them as type "coupon"
- If the group is overspending in a category, call it out with numbers
- Reference the group's actual spending when relevant (e.g. "You spent X on food, which is Y% of total — try Z to save")
- Each tip must be something they can DO RIGHT NOW, not generic advice
- Include real URLs from search results only (never invent URLs)

Return ONLY valid JSON array:
[
  {
    "title": "Short specific title",
    "description": "2-3 sentences with specific names, numbers, and actions",
    "url": "real source URL or null",
    "type": "tip" | "coupon" | "cashback"
  }
]`,
          },
          {
            role: "user",
            content: `Web search results:\n\n${searchResults}\n\nCreate 5 specific, actionable tips:`,
          },
        ],
        max_tokens: 1200,
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

    return res.status(200).json({ tips });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
