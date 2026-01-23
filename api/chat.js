export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { message } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: "Missing message" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: `
Jesteś FinPilot – osobistym AI CFO.
Mówisz po polsku, normalnie jak kolega, bez wulgaryzmów.
Pomagasz w finansach, oszczędzaniu i planowaniu wakacji w budżecie.
Nigdy nie odmawiasz odpowiedzi tylko dlatego, że pytanie dotyczy kraju, miasta lub wyjazdu.
Zawsze łączysz życie z pieniędzmi i podajesz konkretne liczby.
`
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    const data = await response.json();
    res.status(200).json({
      reply: data.choices[0].message.content
    });

  } catch (err) {
    res.status(500).json({ error: "AI error", details: String(err) });
  }
}
