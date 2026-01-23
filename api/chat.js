export const config = {
  runtime: "edge"
};

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Only POST allowed" }),
      { status: 405 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.message) {
    return new Response(
      JSON.stringify({ error: "No message provided" }),
      { status: 400 }
    );
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
      { status: 500 }
    );
  }

  const systemPrompt = `
Jesteś FinPilotem – kumplem od pieniędzy.

Mówisz luźno, normalnie, jak do kolegi.
Nie robisz planów, list, analiz ani coachingu.
Jeśli ktoś pisze "hej" – odpowiadasz krótko i normalnie.
Wakacje, miasta, kraje – OK, ale zawsze w kontekście budżetu.

Styl:
- 1–3 zdania
- język Messenger
- bez moralizowania
`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: body.message }
  ];

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages
    })
  });

  const data = await r.json();

  if (!r.ok) {
    return new Response(
      JSON.stringify({ error: "OpenAI error", details: data }),
      { status: 500 }
    );
  }

  return new Response(
    JSON.stringify({
      reply: data.choices[0].message.content
    }),
    { status: 200 }
  );
}

