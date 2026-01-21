export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  const { message } = req.body || {};
  if (!message || typeof message !== "string") return res.status(400).json({ error: "Missing message" });

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY in Vercel Environment Variables" });
  }

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.75,
        messages: [
          {
            role: "system",
            content:
              "Jesteś FinPilot — AI CFO i planista wakacji w budżecie. Mów po polsku jak kolega, bez wulgaryzmów, bez agresji. Możesz rozmawiać normalnie, ale zawsze trzymasz kontekst finansowy (budżet, koszty, decyzje). Wakacje: wolno Ci proponować kraj/miasto/plan/hotele/loty jako sugestie w budżecie + generować klikalne linki do wyszukiwań (Booking/Google Hotels/Skyscanner/Kayak/Airbnb/Rome2rio). Nie udawaj, że masz ceny na żywo — dawaj widełki i wyjaśniaj, że zależy od terminu."
          },
          { role: "user", content: message }
        ]
      })
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(500).json({ error: "OpenAI request failed", status: r.status, details: data });
    }

    return res.status(200).json({
      reply: data.choices?.[0]?.message?.content || "Brak odpowiedzi AI."
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error", details: String(err) });
  }
}
