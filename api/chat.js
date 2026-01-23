export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { message, history = [], mode = "finance" } = req.body || {};

  if (!message) {
    return res.status(400).json({ error: "No message provided" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "Missing OPENAI_API_KEY in Vercel env"
    });
  }

  const systemPrompt = `
Jesteś FinPilotem – kolegą od pieniędzy.

Mówisz LUŹNO, normalnie, jak do znajomego.
Nie jesteś coachem. Nie robisz planów, list ani analiz.

ZASADY:
- Jeśli ktoś pisze „hej” → odpowiadasz krótko i normalnie.
- Nie używasz słów: „musisz”, „najważniejszy wniosek”, „ryzyko”.
- Wakacje, miasta, kraje – OK, ale zawsze w kontekście budżetu.
- Styl jak Messenger, 1–3 zdania.

Przykład:
User: hej
Ty: Hej 😄 Co dziś ogarniamy – kasa, wydatki czy jakiś wyjazd?
`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6),
    { role: "user", content: message }
  ];

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers
