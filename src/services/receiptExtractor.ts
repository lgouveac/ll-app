const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY as string;

export interface ExtractedReceipt {
  description: string;
  amount: number;
  currency: string;
  date: string | null;
  category: string | null;
  items: Array<{ name: string; amount: number }>;
}

export async function extractReceiptData(file: File): Promise<ExtractedReceipt> {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

  const base64 = await fileToBase64(file);
  console.log("[Receipt] Extracting from:", file.name, "Size:", (file.size / 1024).toFixed(0) + "KB", "Key:", OPENAI_API_KEY ? "set" : "MISSING");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a receipt/expense data extractor. Analyze the image and extract expense information.
Return ONLY valid JSON with this exact structure:
{
  "description": "short description of what was purchased (e.g. 'Jantar Restaurante Sabor', 'Uber corrida', 'Supermercado Extra')",
  "amount": 123.45,
  "currency": "BRL",
  "date": "2026-03-25",
  "category": "food",
  "items": [{"name": "item name", "amount": 10.50}]
}

Rules:
- amount: total value as a number, no formatting
- currency: ISO 4217 code (BRL, USD, EUR, etc). Detect from the receipt's currency symbols (R$=BRL, $=USD, €=EUR, £=GBP, ¥=JPY)
- date: ISO format YYYY-MM-DD, or null if not visible
- category: one of: food, transport, home, entertainment, health, shopping, travel, other
- items: individual line items if visible, empty array if not
- description: concise, in the original language of the receipt
- If the image is not a receipt/expense, still try to describe what expense it might represent
- IMPORTANT: Always try your best to extract data. Even if the image is blurry or partial, give your best estimate for amount, currency, and description. Never return amount as 0 unless you truly cannot see any number at all.
- Look carefully at every number, text, and symbol in the image`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the expense data from this receipt/image:",
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
      max_tokens: 1000,
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

  if (!content) throw new Error("No response from AI");

  // Parse JSON from response (handle markdown code blocks)
  const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(jsonStr) as ExtractedReceipt;

  return {
    description: parsed.description || "Despesa",
    amount: Number(parsed.amount) || 0,
    currency: parsed.currency || "BRL",
    date: parsed.date || null,
    category: parsed.category || null,
    items: Array.isArray(parsed.items) ? parsed.items : [],
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
