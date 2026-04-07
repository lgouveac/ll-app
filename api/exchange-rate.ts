import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { from, to, date } = req.body ?? {};
  if (!from || !to) {
    return res.status(400).json({ error: "from and to are required" });
  }

  const endpoint = date || "latest";
  const url = `https://api.frankfurter.app/${endpoint}?from=${from}&to=${to}`;

  try {
    let response = await fetch(url);

    if (!response.ok && date) {
      response = await fetch(
        `https://api.frankfurter.app/latest?from=${from}&to=${to}`
      );
    }

    if (!response.ok) {
      return res.status(502).json({ error: `Failed to fetch rate for ${from} -> ${to}` });
    }

    const data = await response.json();
    const rate = data.rates?.[to];

    if (!rate) {
      return res.status(404).json({ error: `Rate not found for ${from} -> ${to}` });
    }

    return res.status(200).json({ rate, date: data.date });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
