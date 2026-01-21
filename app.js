// =====================
// Storage
// =====================
const LS_KEY = "finpilot_v2";
const state = {
  balance: 0,
  transactions: [], // {id, date, amount, category, desc}
  chat: [] // {who, text}
};

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.balance = Number(parsed.balance || 0);
    state.transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
    state.chat = Array.isArray(parsed.chat) ? parsed.chat : [];
  } catch {}
}

// =====================
// Elements
// =====================
const pillStatus = document.getElementById("pillStatus");

const balanceEl = document.getElementById("balance");
const btnSetBalance = document.getElementById("btnSetBalance");
const balanceHint = document.getElementById("balanceHint");

const tAmount = document.getElementById("tAmount");
const tCategory = document.getElementById("tCategory");
const tDesc = document.getElementById("tDesc");
const tDate = document.getElementById("tDate");
const btnAddTx = document.getElementById("btnAddTx");
const statusEl = document.getElementById("status");

const monthPick = document.getElementById("monthPick");
const btnThisMonth = document.getElementById("btnThisMonth");

const kIncome = document.getElementById("kIncome");
const kExpense = document.getElementById("kExpense");
const kNet = document.getElementById("kNet");
const tipEl = document.getElementById("tip");

const txTableBody = document.querySelector("#txTable tbody");

const modeEl = document.getElementById("mode");
const chatEl = document.getElementById("chat");
const questionEl = document.getElementById("question");
const btnAsk = document.getElementById("btnAsk");
const btnClearChat = document.getElementById("btnClearChat");

const btnReset = document.getElementById("btnReset");
const btnExport = document.getElementById("btnExport");

// Charts
const ctxLine = document.getElementById("chartLine");
const ctxPie = document.getElementById("chartPie");
let chartLine = null;
let chartPie = null;

// =====================
// Helpers
// =====================
function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function monthKey(dateISO) {
  return (dateISO || "").slice(0, 7); // YYYY-MM
}

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("pl-PL", { style: "currency", currency: "PLN" });
}

function setStatus(msg) {
  statusEl.textContent = msg || "";
  if (msg) setTimeout(() => (statusEl.textContent = ""), 2200);
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
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
}

function renderChat() {
  chatEl.innerHTML = "";
  if (state.chat.length === 0) {
    addBubble("AI", "Siema! 😄\nDaj mi stan konta + wpisuj wydatki/przychody.\nMożesz też pytać: „Gdzie polecisz za 2500 zł na 7 dni?”");
    return;
  }
  for (const m of state.chat) addBubble(m.who, m.text);
}

function pushChat(who, text) {
  state.chat.push({ who, text });
  // limit pamięci
  if (state.chat.length > 40) state.chat.shift();
  save();
  renderChat();
}

function getMonths() {
  const months = new Set();
  for (const t of state.transactions) months.add(monthKey(t.date));
  const arr = Array.from(months).filter(Boolean).sort();
  if (arr.length === 0) arr.push(monthKey(todayISO()));
  return arr;
}

function ensureMonthPicker() {
  const months = getMonths();
  const current = monthPick.value || monthKey(todayISO());

  monthPick.innerHTML = "";
  for (const m of months) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    monthPick.appendChild(opt);
  }
  monthPick.value = months.includes(current) ? current : months[months.length - 1];
}

function monthTransactions(mKey) {
  return state.transactions
    .filter(t => monthKey(t.date) === mKey)
    .sort((a,b) => (a.date > b.date ? 1 : -1));
}

function computeMonth(mKey) {
  const tx = monthTransactions(mKey);
  const income = tx.filter(t => t.amount > 0).reduce((a,b)=>a+b.amount,0);
  const expense = tx.filter(t => t.amount < 0).reduce((a,b)=>a+Math.abs(b.amount),0);
  const net = income - expense;
  return { tx, income, expense, net };
}

// =====================
// Render UI
// =====================
function renderBalance() {
  balanceEl.value = state.balance ? String(state.balance) : "";
  balanceHint.textContent = `Aktualny zapisany stan: ${money(state.balance)} (lokalnie w przeglądarce)`;
}

function renderTable(mKey) {
  const tx = monthTransactions(mKey).slice().reverse(); // najnowsze na górze
  txTableBody.innerHTML = "";

  for (const t of tx) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${t.date}</td>
      <td>${escapeHtml(t.desc || "")}</td>
      <td><span class="badge">${escapeHtml(t.category || "Inne")}</span></td>
      <td class="right">${money(t.amount)}</td>
      <td class="right"><button class="del" data-id="${t.id}">Usuń</button></td>
    `;
    txTableBody.appendChild(tr);
  }
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function renderKpis(mKey) {
  const { income, expense, net, tx } = computeMonth(mKey);

  kIncome.textContent = money(income);
  kExpense.textContent = money(expense);
  kNet.textContent = money(net);

  if (tx.length === 0) {
    tipEl.textContent = "Brak transakcji w tym miesiącu. Dodaj kilka, żeby zobaczyć wykresy i rekomendacje.";
  } else if (net < 0) {
    tipEl.textContent = "Jesteś na minusie — priorytet: obciąć koszty stałe i limitować zmienne.";
  } else {
    tipEl.textContent = "Jesteś na plusie — ustaw limit wydatków i cel oszczędności (np. 20% netto).";
  }
}

function renderCharts(mKey) {
  const { tx } = computeMonth(mKey);
  const sorted = tx.slice().sort((a,b) => (a.date > b.date ? 1 : -1));

  // LINE: saldo w miesiącu (start = stan konta - nie znamy historycznego, więc liczymy "cashflow" od 0)
  // Użytkownik może traktować to jako "wynik miesiąca po dniach".
  let running = 0;
  const labels = [];
  const values = [];

  for (const t of sorted) {
    labels.push(t.date.slice(5)); // MM-DD
    running += t.amount;
    values.push(Number(running.toFixed(2)));
  }

  if (chartLine) chartLine.destroy();
  chartLine = new Chart(ctxLine, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Cashflow narastająco (miesiąc)",
        data: values,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: {
        x: { grid: { display: false } }
      }
    }
  });

  // PIE: wydatki wg kategorii
  const catMap = new Map();
  for (const t of sorted) {
    if (t.amount >= 0) continue;
    const c = t.category || "Inne";
    catMap.set(c, (catMap.get(c) || 0) + Math.abs(t.amount));
  }
  const pieLabels = Array.from(catMap.keys());
  const pieData = Array.from(catMap.values());

  if (chartPie) chartPie.destroy();
  chartPie = new Chart(ctxPie, {
    type: "doughnut",
    data: {
      labels: pieLabels,
      datasets: [{
        label: "Wydatki",
        data: pieData
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } }
    }
  });
}

function renderAll() {
  ensureMonthPicker();
  const mKey = monthPick.value || monthKey(todayISO());
  renderBalance();
  renderKpis(mKey);
  renderTable(mKey);
  renderCharts(mKey);
  renderChat();
}

// =====================
// Events
// =====================
btnSetBalance.addEventListener("click", () => {
  const v = Number(balanceEl.value);
  if (Number.isNaN(v)) return setStatus("Nieprawidłowy stan.");
  state.balance = v;
  save();
  renderBalance();
  setStatus("Stan konta zapisany ✅");
});

btnAddTx.addEventListener("click", () => {
  const amount = Number(tAmount.value);
  if (Number.isNaN(amount) || amount === 0) return setStatus("Wpisz kwotę (np. -600 lub 4500).");
  const desc = (tDesc.value || "").trim();
  if (!desc) return setStatus("Dodaj opis (np. Lidl / Faktura #12).");
  const date = tDate.value || todayISO();
  const category = tCategory.value || "Inne";

  state.transactions.push({
    id: uid(),
    date,
    amount,
    category,
    desc
  });

  save();
  setStatus("Dodano transakcję ✅");

  // clear inputs
  tAmount.value = "";
  tDesc.value = "";
  tDate.value = "";

  renderAll();
});

txTableBody.addEventListener("click", (e) => {
  const btn = e.target.closest("button.del");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  state.transactions = state.transactions.filter(t => t.id !== id);
  save();
  renderAll();
});

monthPick.addEventListener("change", () => renderAll());

btnThisMonth.addEventListener("click", () => {
  const m = monthKey(todayISO());
  ensureMonthPicker();
  monthPick.value = m;
  renderAll();
});

// Export CSV
btnExport.addEventListener("click", () => {
  const rows = [["date","description","category","amount"]];
  for (const t of state.transactions.slice().sort((a,b)=> (a.date>b.date?1:-1))) {
    rows.push([t.date, t.desc, t.category, String(t.amount)]);
  }
  const csv = rows.map(r => r.map(x => `"${String(x).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "finpilot-transactions.csv";
  a.click();
  URL.revokeObjectURL(url);
});

// Reset
btnReset.addEventListener("click", () => {
  if (!confirm("Na pewno? Usunie to dane i chat z tej przeglądarki.")) return;
  localStorage.removeItem(LS_KEY);
  location.reload();
});

// Chat
btnClearChat.addEventListener("click", () => {
  state.chat = [];
  save();
  renderChat();
});

function buildAIMessage(userText) {
  const mKey = monthPick.value || monthKey(todayISO());
  const { income, expense, net, tx } = computeMonth(mKey);

  const txPreview = tx.slice(-15).map(t => `${t.date} | ${t.category} | ${t.desc} | ${t.amount}`).join("\n");
  const mode = modeEl.value;

  if (mode === "vacation") {
    return `
Użytkownik planuje wakacje w budżecie. Mów po polsku jak kolega, konkretnie.
Kontekst finansowy (miesiąc ${mKey}):
- Przychody: ${money(income)}
- Koszty: ${money(expense)}
- Netto: ${money(net)}
- Stan konta (deklaracja): ${money(state.balance)}
- Transakcje (max 15):
${txPreview || "(brak)"}

Zasady odpowiedzi:
- Możesz proponować kraj/miasto, ale zawsze w kontekście budżetu i kosztów.
- Jeśli brakuje danych (np. ile osób, dni, termin) — zadaj max 3 krótkie pytania.
- Dawaj 3 warianty: tanio / normalnie / wygodnie.
- Zero wulgaryzmów.

Pytanie użytkownika: ${userText}
`.trim();
  }

  return `
Użytkownik pyta o finanse. Mów po polsku jak kolega, konkretnie, bez wulgaryzmów.
Kontekst (miesiąc ${mKey}):
- Przychody: ${money(income)}
- Koszty: ${money(expense)}
- Netto: ${money(net)}
- Stan konta (deklaracja): ${money(state.balance)}
- Transakcje (max 15):
${txPreview || "(brak)"}

Odpowiedz formatem:
1) Najważniejszy wniosek (1 zdanie)
2) 3 konkretne kroki na tydzień
3) 1 ryzyko (jeśli jest)
4) 1 pytanie doprecyzowujące (jeśli potrzebne)

Pytanie użytkownika: ${userText}
`.trim();
}

async function askAI() {
  const q = (questionEl.value || "").trim();
  if (!q) return;

  pushChat("Ty", q);
  questionEl.value = "";

  // placeholder
  const thinking = "Myślę…";
  pushChat("AI", thinking);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: buildAIMessage(q) })
    });

    const data = await res.json();

    // usuń "Myślę…" i dodaj realną odpowiedź
    state.chat = state.chat.filter(m => m.text !== thinking);
    save();

    if (!res.ok) {
      pushChat("AI", `Błąd AI: ${data?.error || "unknown"}`);
      return;
    }

    pushChat("AI", data.reply || "Brak odpowiedzi AI.");
  } catch (e) {
    state.chat = state.chat.filter(m => m.text !== thinking);
    save();
    pushChat("AI", "Nie mogę połączyć się z backendem /api/chat (sprawdź Vercel).");
  }
}

btnAsk.addEventListener("click", askAI);
questionEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") askAI();
});

// =====================
// Init
// =====================
load();
tDate.value = todayISO();
renderAll();
