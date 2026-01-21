// ===== Elements =====
const csvEl = document.getElementById("csv");
const btnImport = document.getElementById("btnImport");
const btnDemo = document.getElementById("btnDemo");
const statusEl = document.getElementById("status");

const incomeEl = document.getElementById("income");
const expenseEl = document.getElementById("expense");
const netEl = document.getElementById("net");
const tipEl = document.getElementById("tip");

const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("question");
const btnAsk = document.getElementById("btnAsk");
const btnClear = document.getElementById("btnClear");
const modeEl = document.getElementById("mode");

// ===== Data =====
let transactions = [];

// ===== Helpers =====
function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("pl-PL", { style: "currency", currency: "PLN" });
}

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function addBubble(who, text) {
  const div = document.createElement("div");
  div.className = `bubble ${who === "Ty" ? "user" : "ai"}`;
  div.innerHTML = `
    <div class="meta">${who}</div>
    <div class="text"></div>
  `;
  div.querySelector(".text").textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
  return div;
}

function summary() {
  const income = transactions.filter(t => t.amount > 0).reduce((a,b)=>a+b.amount,0);
  const expense = transactions.filter(t => t.amount < 0).reduce((a,b)=>a+Math.abs(b.amount),0);
  const net = income - expense;

  incomeEl.textContent = money(income);
  expenseEl.textContent = money(expense);
  netEl.textContent = money(net);

  // prosta wskazówka
  if (transactions.length === 0) {
    tipEl.textContent = "Zaimportuj dane, a AI podpowie decyzje.";
  } else if (net < 0) {
    tipEl.textContent = "Jesteś na minusie — AI pomoże znaleźć cięcia kosztów.";
  } else {
    tipEl.textContent = "Jesteś na plusie — AI pomoże ustawić cele i budżety.";
  }

  return { income, expense, net };
}

function parseCSV(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    const [date, description, amountStr] = line.split(",").map(x => (x || "").trim());
    const amount = Number(String(amountStr || "").replace(",", "."));
    if (!description || Number.isNaN(amount)) continue;
    out.push({ date: date || "", description, amount });
  }
  return out;
}

// ===== Actions =====
btnDemo?.addEventListener("click", () => {
  csvEl.value = `2026-01-01,Faktura #1,6500
2026-01-03,Abonamenty,-180
2026-01-05,Czynsz,-2200
2026-01-08,Jedzenie,-900
2026-01-12,Faktura #2,4100
2026-01-15,Transport,-220
2026-01-18,Software,-130`;
  setStatus("Wczytano demo. Kliknij „Importuj CSV”.");
});

btnImport?.addEventListener("click", () => {
  transactions = parseCSV(csvEl.value);
  summary();
  setStatus(`Zaimportowano: ${transactions.length} pozycji.`);
});

// ===== AI prompt builder =====
function buildUserMessage(userText) {
  const { income, expense, net } = summary();
  const mode = modeEl?.value || "cfo";

  const txPreview = transactions.slice(-12).map(t => `${t.date || "-"} | ${t.description} | ${t.amount}`).join("\n");

  if (mode === "vacation") {
    return `
Kontekst finansów użytkownika:
- Przychody: ${money(income)}
- Koszty: ${money(expense)}
- Netto: ${money(net)}
- Ostatnie transakcje (max 12):
${txPreview || "(brak danych)"}

Użytkownik pyta o wakacje. Odpowiedz: 
1) czy budżet jest realny (tak/nie + dlaczego),
2) ile max bezpiecznie wydać (konkretnie),
3) 3 warianty planu: oszczędny / normalny / komfort,
4) krótkie kroki co zrobić jutro.

Pytanie użytkownika: ${userText}
`.trim();
  }

  return `
Kontekst finansów użytkownika:
- Przychody: ${money(income)}
- Koszty: ${money(expense)}
- Netto: ${money(net)}
- Ostatnie transakcje (max 12):
${txPreview || "(brak danych)"}

Użytkownik pyta o finanse. Odpowiedz krótko i konkretnie:
- 3 najważniejsze wnioski,
- 3 kroki na najbliższy tydzień,
- 1 ostrzeżenie (jeśli jest ryzyko),
- zadawaj 1 pytanie doprecyzowujące.

Pytanie użytkownika: ${userText}
`.trim();
}

// ===== AI call =====
async function askAI() {
  const q = inputEl.value.trim();
  if (!q) return;

  addBubble("Ty", q);
  inputEl.value = "";

  const thinking = addBubble("AI", "Myślę…");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: buildUserMessage(q) })
    });

    const data = await res.json();

    if (!res.ok) {
      thinking.remove();
      addBubble("AI", `Błąd serwera AI: ${data?.error || "unknown"}`);
      return;
    }

    // podmień "myślę..." na odpowiedź
    thinking.querySelector(".text").textContent = data.reply || "Brak odpowiedzi AI.";
  } catch (e) {
    thinking.remove();
    addBubble("AI", "Nie mogę połączyć się z backendem /api/chat. Sprawdź Vercel.");
  }
}

btnAsk?.addEventListener("click", askAI);
inputEl?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") askAI();
});

btnClear?.addEventListener("click", () => {
  chatEl.innerHTML = "";
  addBubble("AI", "Siema! Wklej CSV albo pytaj o budżet/rachunki. 👇");
});

// start
summary();
addBubble("AI", "Siema! Jestem Twoim AI CFO. Wklej CSV albo zapytaj: „Jak obciąć koszty o 20%?”");
