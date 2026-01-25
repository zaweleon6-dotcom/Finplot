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

  const body = await req.json();
  const message = body?.message;

  if (!message) {
    return new Response(
      JSON.stringify({ error: "No message" }),
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
      { status: 500 }
    );
  }

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: message }
      ]
    })
  });

  const data = await r.json();

  return new Response(
    JSON.stringify({
      reply: data.choices?.[0]?.message?.content || "no reply"
    }),
    { status: 200 }
  );
}
