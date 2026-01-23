import OpenAI from "openai";

/*
  ==========================================================
  FinPilot AI – backend chat
  Styl: kolega od kasy, bez coachingu, bez moralizowania
  Zakres: finanse osobiste, wydatki, oszczędzanie, wakacje
  ==========================================================
*/

// ================== OPENAI INIT ==================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ================== HELPERS ==================
function sanitize(text = "") {
  return text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function shortReply(text) {
  if (!text) return "";
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.slice(0, 4).join(" ");
}

// ================== SYSTEM PROMPT ==================
const SYSTEM_PROMPT = `
Jesteś FinPilotem – kolegą od pieniędzy.

Mówisz LUŹNO, normalnie, jak do znajomego.
Nie jesteś coachem, nie robisz analiz, nie piszesz planów punktowanych.

ZASADY:
- Jeśli użytkownik pisze "hej", "siema", "elo" → odpowiadasz krótko i normalnie.
- Nie wyciągasz wniosków bez danych.
- Nie piszesz list typu "1) 2) 3)".
- Nie używasz słów: "musisz", "najważniejszy wniosek", "ryzyko".
- Jeśli pytanie jest luźne → odpowiedź luźna.
- Jeśli pytanie o finanse → praktyczna, życiowa rada.
- Wakacje, kraje, miasta, hotele – OK, ale zawsze w kontekście budżetu.
- Zero moralizowania.

STYL:
- 1–4 zdania
- jak Messenger / WhatsApp
- naturalny język
- bez emoji nadużywania (max 1)

PRZYKŁADY:

User: hej  
Ty: Hej 😄 Co dziś ogarniamy – kasa, wydatki czy jakiś wyjazd?

User: jak tanio polecieć do Hiszpanii  
Ty: Da się tanio, serio. Poza sezonem loty potrafią być po 200–300 zł, a nocleg ogarniemy taniej poza centrum.

User: wydałem 600 zł na zakupy  
Ty: Sporo jak na jeden strzał. Jeśli to często się powtarza, może warto rozbić zakupy albo zmienić sklep.
`;

// ================== MAIN HANDLER ==================
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { message, history = [], mode = "finance" } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "No message provided" });
    }

    // ================== MODE PROMPTS ==================
    let modePrompt = "";
    if (mode === "vacation") {
      modePrompt = `
Tryb WAKACJE:
- Doradzasz tanie wyjazdy
- Podajesz kraje, miasta, typy noclegów
- Możesz wspominać o lotach, hotelach, Airbnb
- NIE wklejasz linków losowo, tylko jeśli ma to sens
`;
    } else {
      modePrompt = `
Tryb FINANSE:
- Wydatki, oszczędzanie, rachunki
- Codzienne decyzje finansowe
- Proste, życiowe porady
`;
    }

    // ================== BUILD MESSAGES ==================
    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT + "\n" + modePrompt,
      },
    ];

    // ograniczona historia (max 6 ostatnich wiadomości)
    if (Array.isArray(history)) {
      history.slice(-6).forEach((h) => {
        if (h.role && h.content) {
          messages.push({
            role: h.role,
            content: h.content,
          });
        }
      });
    }

    messages.push({
      role: "user",
      content: message,
    });

    // ================== OPENAI CALL ==================
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages,
    });

    let reply = completion.choices[0].message.content || "";
    reply = sanitize(reply);
    reply = shortReply(reply);

    // ================== SAFE GUARDS ==================
    if (
      reply.toLowerCase().includes("najważniejszy") ||
      reply.toLowerCase().includes("musisz") ||
      reply.toLowerCase().includes("ryzyko")
    ) {
      reply =
        "Okej, to uprośćmy 😄 Powiedz mi konkretnie, co chcesz ogarnąć – wydatki, oszczędzanie czy jakiś wyjazd.";
    }

    // ================== RESPONSE ==================
    res.status(200).json({
      reply,
    });
  } catch (error) {
    res.status(500).json({
      error: "AI error",
      details: error.message,
    });
  }
}

/*
  ==========================================================
  TODO (na później, NIE TERAZ):
  - pamięć użytkownika (localStorage / DB)
  - sugestie oszczędności na podstawie historii
  - tryb „planowanie miesiąca”
  - tryb „wakacje + budżet”
  ==========================================================
*/

