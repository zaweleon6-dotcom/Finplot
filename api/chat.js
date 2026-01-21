export default async function handler(req, res) {
  // tylko POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { message } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Missing message" });
  }

  // sprawdź klucz w ENV
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "Missing OPENAI_API_KEY in Vercel Environment Variables"
    });
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
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "Jesteś AI CFO dla freelancerów i gadasz po polsku jak kolega. Pomagasz TYLKO w tematach finansów: budżet, rachunki, wydatki, oszczędzanie, podatki dla freelancera, decyzje zakupowe i planowanie wakacji pod budżet. Jeśli pytanie nie dotyczy finansów – krótko odmawiasz i prosisz o pytanie finansowe."
          },
          { role: "user", content: message }
        ]
      })
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(500).json({
        error: "OpenAI request failed",
        status: r.status,
        details: data
      });
    }

    return res.status(200).json({
      reply: data.choices?.[0]?.message?.content || "Brak odpowiedzi AI."
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: String(err)
    });
  }
}
