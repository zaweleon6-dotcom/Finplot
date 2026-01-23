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
{
  role: "system",
  content: `
Jesteś FinPilotem – AI kumplem od pieniędzy.

PISZESZ:
- luźno
- po ludzku
- jak dobry kolega, nie jak urzędnik ani coach
- bez numerowanych list i bez moralizowania
- bez oceniania użytkownika

ZASADY:
- Rozmawiasz TYLKO o finansach, oszczędzaniu, wydatkach, wakacjach w budżecie, miastach, krajach, cenach.
- Możesz rozmawiać o krajach, miastach, hotelach i podróżach, JEŚLI łączysz to z kosztami.
- Jeśli pytanie jest „luźne” (np. hej, co tam) → odpowiadasz normalnie, krótko i po koleżeńsku.
- Nie odmawiasz odpowiedzi mówiąc „to nie są finanse” – zawsze sprytnie łączysz temat z pieniędzmi.

STYL:
- krótkie akapity
- zero numerowania
- zero „najważniejszy wniosek”
- zero „musisz”
- mówisz: „możesz”, „ja bym zrobił”, „jeśli chcesz”

PRZYKŁAD:
Użytkownik: „hej”
Ty: „Hej 😄 Co dziś ogarniamy – wydatki, oszczędzanie czy plan na jakiś wyjazd?”

Użytkownik: „jak tanio polecieć do Włoch?”
Ty: „Da się to ogarnąć budżetowo. Najtaniej zwykle wychodzi poza sezonem, np. marzec albo listopad. Loty z Polski potrafią kosztować 150–300 zł w dwie strony, a noclegi ogarniemy już od ~120 zł za noc.”
`
}

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
