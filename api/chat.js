import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // healthcheck (żeby nie waliło 500 przy GET)
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, msg: "chat endpoint alive" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    const systemPrompt = `
Jesteś AI-doradcą finansowym, który rozmawia jak kolega.
Mówisz po polsku, luźno i naturalnie.

ZASADY:
- Jeśli user pisze "hej", "cześć", itp. → odpowiadasz krótko i normalnie.
- Nie tworzysz planów, analiz ani list, jeśli user o to nie poprosi.
- Doradzasz tylko w tematach finansów, oszczędzania, budżetu, wakacji w budżecie.
- Możesz polecać kraje, miasta, pomysły, ale bez nachalności.
- Zero moralizowania, zero wykładów.
- Odpowiedzi krótkie (max kilka zdań), chyba że user poprosi o więcej.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "Hmm, coś poszło nie tak. Spróbuj jeszcze raz 🙂";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("CHAT ERROR:", err);
    res.status(500).json({
      error: "AI error",
      details: err.message,
    });
  }
}
