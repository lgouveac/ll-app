const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY as string;

export interface ExtractedExpense {
  description: string;
  amount: number;
  currency: string;
  date: string | null;
  category: string | null;
}

export interface ExtractedReceipt {
  expenses: ExtractedExpense[];
  currency: string;
  date: string | null;
}

export async function extractReceiptData(file: File): Promise<ExtractedReceipt> {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

  const base64 = await fileToBase64(file);
  console.log("[Receipt] Extracting from:", file.name, "Size:", (file.size / 1024).toFixed(0) + "KB");

  const todayISO = new Date().toISOString().slice(0, 10);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert receipt/expense data extractor. Analyze the image carefully and extract ALL expenses visible.

Return ONLY valid JSON with this EXACT structure:
{
  "currency": "USD",
  "date": "YYYY-MM-DD or null",
  "expenses": [
    {
      "description": "Item or expense description",
      "amount": 12.99,
      "category": "food"
    },
    {
      "description": "Another item",
      "amount": 5.50,
      "category": "food"
    }
  ]
}

CRITICAL RULES:
- currency: Detect from the receipt. Use ISO 4217 codes: R$=BRL, $=USD, €=EUR, £=GBP, ¥=JPY. DO NOT default to BRL unless you see R$.
- If the receipt shows $ without country context, use USD.
- expenses: Extract EVERY individual item/expense visible. If there are 10 items, return 10 objects.
- Each expense must have: description (concise, original language), amount (number, no formatting), category (one of: food, transport, home, entertainment, health, shopping, travel, other)
- date: ISO format YYYY-MM-DD from the receipt itself. Return null if no date is clearly visible — do NOT invent a date or copy the placeholder above.
- Date format on receipts is ambiguous: "04/05/2026" can be 4-May (DD/MM/YYYY, BR/EU) or 5-Apr (MM/DD/YYYY, US). Default to DD/MM/YYYY unless the receipt clearly indicates US format (month name in English, ZIP code, "$" with US address, etc.).
- The extracted date MUST be on or before today (${todayISO}). If parsing yields a future date, you parsed the format wrong — try the other interpretation, or return null.
- If the image shows a single total with no itemization, return one expense with that total
- NEVER return amount as 0 unless truly invisible
- Look at EVERY number, text and symbol carefully`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Today is ${todayISO}. Extract ALL expenses from this receipt/image. List every item individually:`,
            },
            {
              type: "image_url",
              image_url: {
                url: base64,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = (err as Record<string, Record<string, string>>)?.error?.message || `OpenAI API error: ${response.status}`;
    console.error("[Receipt] OpenAI error:", response.status, msg);
    throw new Error(msg);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  console.log("[Receipt] Raw AI response:", content);

  if (!content) throw new Error("No response from AI");

  const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(jsonStr);

  // Normalize response
  const currency = parsed.currency || "USD";
  const date = parsed.date || null;
  const expenses: ExtractedExpense[] = [];

  if (Array.isArray(parsed.expenses)) {
    for (const item of parsed.expenses) {
      expenses.push({
        description: item.description || "Despesa",
        amount: Number(item.amount) || 0,
        currency,
        date,
        category: item.category || null,
      });
    }
  }

  // Fallback: old format compatibility
  if (expenses.length === 0 && parsed.amount) {
    expenses.push({
      description: parsed.description || "Despesa",
      amount: Number(parsed.amount) || 0,
      currency: parsed.currency || "USD",
      date: parsed.date || null,
      category: parsed.category || null,
    });
  }

  return { expenses, currency, date };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
