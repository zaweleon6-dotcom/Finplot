// =====================
// Storage
// =====================
const LS_KEY = "finpilot_v3";
const state = {
  balance: 0,
  transactions: [], // {id, date, amount, category, desc}
  chat: [],
  plan: {
    income: 0,
    fixed: 0,
    fun: 0,
    save: 0,
    trips: 0,
    other: 0
  }
};

function save(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
function load(){
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return;
  try {
    const p = JSON.parse(raw);
    state.balance = Number(p.balance || 0);
    state.transactions = Array.isArray(p.transactions) ? p.transactions : [];
    state.chat = Array.isArray(p.chat) ? p.chat : [];
    state.plan = p.plan ? {
      income: Number(p.plan.income || 0),
      fixed: Number(p.plan.fixed || 0),
      fun: Number(p.plan.fun || 0),
      save: Number(p.plan.save || 0),
      trips: Number(p.plan.trips || 0),
      other: Number(p.plan.other || 0),
    } : state.plan;
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

// Plan
const planIncome = document.getElementById("planIncome");
const planFixed = document.getElementById("planFixed");
const planFun = document.getElementById("planFun");
const planSave = document.getElementById("planSave");
const planTrips = document.getElementById("planTrips");
const planOther = document.getElementById("planOther");
const btnSavePlan = document.getElementById("btnSavePlan");
const btnUsePlanThisMonth = document.getElementById("btnUsePlanThisMonth");
const planStatus = document.getElementById("planStatus");
const planLeft = document.getElementById("planLeft");
const barFixed = document.getElementById("barFixed");
const barFun = document.getElementById("barFun");
const barSave = document.getElementById("barSave");
const barTrips = document.getElementById("barTrips");
const barOther = document.getElementById("barOther");

// Chat
const modeEl = document.getElementById("mode");
const chatEl = document.getElementById("chat");
const questionEl = document.getElementById("question");
const btnAsk = document.getElementById("btnAsk");
const btnClearChat = document.getElementById("btnClearChat");

const btnReset = document.getElementById("btnReset");
const btnExport = document.getElementById("btnExport");

// Tabs
const tabButtons = document.querySelectorAll(".tab");
const tabBudget = document.getElementById("tab-budget");
const tabPlans = document.getElementById("tab-plans");
const tabAI = document.getElementById("tab-ai");

// Charts
const ctxLine = document.getElementById("chartLine");
const ctxPie = document.getElementById("chartPie");
let chartLine = null;
let chartPie = null;

// =====================
// Helpers
// =====================
function todayISO(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}
function monthKey(dateISO){ return (dateISO || "").slice(0,7); }
function money(n){
  const v = Number(n || 0);
  return v.toLocaleString("pl-PL",{style:"currency",currency:"PLN"});
}
function uid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
function setStatus(msg){
  statusEl.textContent = msg || "";
  if (msg) setTimeout(()=> statusEl.textContent="", 2200);
}
function setPlanStatus(msg){
  planStatus.textContent = msg || "";
  if (msg) setTimeout(()=> planStatus.textContent="", 2200);
}
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function getMonths(){
  const months = new Set();
  for (const t of state.transactions) months.add(monthKey(t.date));
  const arr = Array.from(months).filter(Boolean).sort();
  if (arr.length===0) arr.push(monthKey(todayISO()));
  return arr;
}
function ensureMonthPicker(){
  const months = getMonths();
  const current = monthPick.value || monthKey(todayISO());
  monthPick.innerHTML = "";
  for (const m of months){
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    monthPick.appendChild(opt);
  }
  monthPick.value = months.includes(current) ? current : months[months.length-1];
}
function monthTransactions(mKey){
  return state.transactions
    .filter(t => monthKey(t.date) === mKey)
    .sort((a,b)=> (a.date>b.date?1:-1));
}
function computeMonth(mKey){
  const tx = monthTransactions(mKey);
  const income = tx.filter(t=>t.amount>0).reduce((a,b)=>a+b.amount,0);
  const expense = tx.filter(t=>t.amount<0).reduce((a,b)=>a+Math.abs(b.amount),0);
  const net = income - expense;
  return { tx, income, expense, net };
}

// Color generator (stable per category)
function hashColor(str){
  let h = 0;
  for (let i=0;i<str.length;i++) h = (h*31 + str.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 70% 55%)`;
}

// =====================
// Tabs
// =====================
function showTab(name){
  tabButtons.forEach(b => b.classList.toggle("active", b.dataset.tab===name));
  tabBudget.classList.toggle("show", name==="budget");
  tabPlans.classList.toggle("show", name==="plans");
  tabAI.classList.toggle("show", name==="ai");
}
tabButtons.forEach(btn=>{
  btn.addEventListener("click", ()=> showTab(btn.dataset.tab));
});

// =====================
// Render
// =====================
function renderBalance(){
  balanceEl.value = state.balance ? String(state.balance) : "";
  balanceHint.textContent = `Zapisany stan: ${money(state.balance)} (lokalnie)`;
}
function renderTable(mKey){
  const tx = monthTransactions(mKey).slice().reverse();
  txTableBody.innerHTML = "";
  for (const t of tx){
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.date}</td>
      <td>${escapeHtml(t.desc||"")}</td>
      <td><span class="badge">${escapeHtml(t.category||"Inne")}</span></td>
      <td class="right">${money(t.amount)}</td>
      <td class="right"><button class="del" data-id="${t.id}">Usuń</button></td>
    `;
    txTableBody.appendChild(tr);
  }
}
function renderKpis(mKey){
  const { income, expense, net, tx } = computeMonth(mKey);
  kIncome.textContent = money(income);
  kExpense.textContent = money(expense);
  kNet.textContent = money(net);

  if (tx.length===0) tipEl.textContent = "Dodaj transakcje w tym miesiącu — wtedy wykresy i AI będą konkretne.";
  else if (net < 0) tipEl.textContent = "Masz miesiąc na minusie — priorytet: stałe koszty + limity na zmienne.";
  else tipEl.textContent = "Jesteś na plusie — ustaw cel oszczędności (np. 20%) i budżet zachcianek.";
}
function renderCharts(mKey){
  const { tx } = computeMonth(mKey);
  const sorted = tx.slice().sort((a,b)=> (a.date>b.date?1:-1));

  // LINE (always show something)
  const labels = [];
  const values = [];
  let running = 0;

  if (sorted.length === 0) {
    labels.push("brak danych");
    values.push(0);
  } else {
    for (const t of sorted){
      labels.push(t.date.slice(5)); // MM-DD
      running += t.amount;
      values.push(Number(running.toFixed(2)));
    }
  }

  if (chartLine) chartLine.destroy();
  chartLine = new Chart(ctxLine, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Cashflow narastająco",
        data: values,
        tension: 0.35,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { x: { grid:{display:false} } }
    }
  });

  // PIE/DONUT with colors per category
  const catMap = new Map();
  for (const t of sorted){
    if (t.amount >= 0) continue;
    const c = t.category || "Inne";
    catMap.set(c, (catMap.get(c)||0) + Math.abs(t.amount));
  }

  let pieLabels = Array.from(catMap.keys());
  let pieData = Array.from(catMap.values());

  if (pieLabels.length === 0) {
    pieLabels = ["brak wydatków"];
    pieData = [1];
  }

  const colors = pieLabels.map(l => l==="brak wydatków" ? "rgba(255,255,255,.25)" : hashColor(l));

  if (chartPie) chartPie.destroy();
  chartPie = new Chart(ctxPie, {
    type: "doughnut",
    data: {
      labels: pieLabels,
      datasets: [{
        label: "Wydatki",
        data: pieData,
        backgroundColor: colors
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } }
    }
  });
}
function addBubble(who, text){
  const div = document.createElement("div");
  div.className = `bubble ${who==="Ty" ? "user" : "ai"}`;
  div.innerHTML = `<div class="meta">${who}</div><div class="text"></div>`;
  div.querySelector(".text").textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}
function renderChat(){
  chatEl.innerHTML = "";
  if (state.chat.length === 0){
    addBubble("AI","Siema 😄\n1) Dodaj transakcje.\n2) W trybie ✈️ poproś o wakacje w budżecie — dostaniesz też linki do hoteli/lotów.\n3) W trybie 🧠 dostaniesz życiowe sposoby oszczędzania.");
    return;
  }
  for (const m of state.chat) addBubble(m.who, m.text);
}
function pushChat(who, text){
  state.chat.push({who,text});
  if (state.chat.length > 50) state.chat.shift();
  save();
  renderChat();
}

// PLAN
function renderPlan(){
  planIncome.value = state.plan.income || "";
  planFixed.value = state.plan.fixed || "";
  planFun.value = state.plan.fun || "";
  planSave.value = state.plan.save || "";
  planTrips.value = state.plan.trips || "";
  planOther.value = state.plan.other || "";

  const income = Number(state.plan.income||0);
  const fixed = Number(state.plan.fixed||0);
  const fun = Number(state.plan.fun||0);
  const saveP = Number(state.plan.save||0);
  const trips = Number(state.plan.trips||0);
  const other = Number(state.plan.other||0);

  const spentPlanned = fixed + fun + saveP + trips + other;
  const left = income - spentPlanned;

  planLeft.textContent = money(left);

  const safePct = (x)=> income>0 ? Math.max(0, Math.min(100, (x/income)*100)) : 0;
  barFixed.style.width = `${safePct(fixed)}%`;
  barFun.style.width = `${safePct(fun)}%`;
  barSave.style.width = `${safePct(saveP)}%`;
  barTrips.style.width = `${safePct(trips)}%`;
  barOther.style.width = `${safePct(other)}%`;
}

function renderAll(){
  ensureMonthPicker();
  const mKey = monthPick.value || monthKey(todayISO());
  renderBalance();
  renderKpis(mKey);
  renderTable(mKey);
  renderCharts(mKey);
  renderPlan();
  renderChat();
}

// =====================
// Events
// =====================
btnSetBalance?.addEventListener("click", ()=>{
  const v = Number(balanceEl.value);
  if (Number.isNaN(v)) return setStatus("Nieprawidłowy stan.");
  state.balance = v;
  save();
  renderBalance();
  setStatus("Stan konta zapisany ✅");
});

btnAddTx?.addEventListener("click", ()=>{
  const amount = Number(tAmount.value);
  if (Number.isNaN(amount) || amount===0) return setStatus("Wpisz kwotę (np. -600 lub 4500).");
  const desc = (tDesc.value||"").trim();
  if (!desc) return setStatus("Dodaj opis (np. Lidl / Faktura).");
  const date = tDate.value || todayISO();
  const category = tCategory.value || "Inne";

  state.transactions.push({ id: uid(), date, amount, category, desc });
  save();

  tAmount.value="";
  tDesc.value="";
  tDate.value="";

  setStatus("Dodano ✅");
  renderAll();
});

txTableBody?.addEventListener("click",(e)=>{
  const btn = e.target.closest("button.del");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  state.transactions = state.transactions.filter(t=>t.id!==id);
  save();
  renderAll();
});

monthPick?.addEventListener("change", ()=> renderAll());
btnThisMonth?.addEventListener("click", ()=>{
  const m = monthKey(todayISO());
  ensureMonthPicker();
  monthPick.value = m;
  renderAll();
});

// Export CSV
btnExport?.addEventListener("click", ()=>{
  const rows = [["date","description","category","amount"]];
  for (const t of state.transactions.slice().sort((a,b)=> (a.date>b.date?1:-1))){
    rows.push([t.date, t.desc, t.category, String(t.amount)]);
  }
  const csv = rows.map(r=> r.map(x=> `"${String(x).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "finpilot-transactions.csv";
  a.click();
  URL.revokeObjectURL(url);
});

// Reset
btnReset?.addEventListener("click", ()=>{
  if (!confirm("Na pewno? Usunie to dane i chat z tej przeglądarki.")) return;
  localStorage.removeItem(LS_KEY);
  location.reload();
});

// Plan save
btnSavePlan?.addEventListener("click", ()=>{
  state.plan.income = Number(planIncome.value||0);
  state.plan.fixed = Number(planFixed.value||0);
  state.plan.fun = Number(planFun.value||0);
  state.plan.save = Number(planSave.value||0);
  state.plan.trips = Number(planTrips.value||0);
  state.plan.other = Number(planOther.value||0);
  save();
  renderPlan();
  setPlanStatus("Plan zapisany ✅");
});

// optional: “use plan this month”
btnUsePlanThisMonth?.addEventListener("click", ()=>{
  // Tu możesz później zrobić konkret: np. automatyczny “cel” i powiadomienie.
  setPlanStatus("Gotowe ✅ (w następnym kroku dodamy cele i progress).");
});

// Chat clear
btnClearChat?.addEventListener("click", ()=>{
  state.chat = [];
  save();
  renderChat();
});

// =====================
// AI prompt builder (links + savings)
// =====================
function buildVacationLinks(hints){
  // hints string already. We generate “search links” without real-time prices.
  // User can click and filter.
  const base = encodeURIComponent(hints);
  return [
    `Booking (hotele): https://www.booking.com/searchresults.pl.html?ss=${base}`,
    `Google Hotels: https://www.google.com/travel/hotels?q=${base}`,
    `Skyscanner (loty): https://www.skyscanner.pl/transport/flights-to/${encodeURIComponent("anywhere")}/?adultsv2=2`,
    `Kayak: https://www.kayak.pl/explore/${encodeURIComponent("Polska")}?budget=${encodeURIComponent("")}`
  ].join("\n");
}

function buildAIMessage(userText){
  const mKey = monthPick.value || monthKey(todayISO());
  const { income, expense, net, tx } = computeMonth(mKey);
  const txPreview = tx.slice(-18).map(t => `${t.date} | ${t.category} | ${t.desc} | ${t.amount}`).join("\n");

  const mode = modeEl.value;

  if (mode === "vacation"){
    return `
Jesteś FinPilot. Odpowiadasz po polsku jak kolega, bez wulgaryzmów.
Masz planować WAKACJE W BUDŻECIE i możesz wspominać kraj/miasto/hotele, ale zawsze z perspektywy kosztów.

Kontekst finansowy:
- Miesiąc: ${mKey}
- Przychody: ${money(income)}
- Koszty: ${money(expense)}
- Netto: ${money(net)}
- Stan konta (deklaracja): ${money(state.balance)}
- Transakcje (max 18):
${txPreview || "(brak)"}

Zasady:
- Zadaj max 3 pytania doprecyzowujące jeśli brak danych.
- Zawsze dawaj 3 opcje: TANIO / NORMALNIE / WYGODNIE (z widełkami kosztów).
- Na końcu zawsze dodaj 6 linków “wyszukiwarki” (nie muszą być idealne, ale klikalne) do: Booking, Google Hotels, Skyscanner, Kayak, Airbnb, Rome2rio.
- Linki mają zawierać sugerowane miasto/kraj/termin w tekście (nie musisz znać dokładnych cen).
- Nie odmawiaj jeśli user pyta o kraj/miasto – masz to uwzględnić.

Pytanie usera: ${userText}
`.trim();
  }

  if (mode === "saver"){
    return `
Jesteś FinPilot. Odpowiadasz po polsku jak kolega, bez wulgaryzmów.
Twoim zadaniem jest dawać ŻYCIOWE OSZCZĘDNOŚCI na bazie wydatków usera (transport/jedzenie/abonamenty/zakupy).

Kontekst:
- Miesiąc: ${mKey}
- Przychody: ${money(income)}
- Koszty: ${money(expense)}
- Netto: ${money(net)}
- Stan konta (deklaracja): ${money(state.balance)}
- Transakcje (max 18):
${txPreview || "(brak)"}

Format odpowiedzi:
1) 1 zdanie: gdzie “ucieka” kasa
2) 5 konkretnych tipów (bardzo praktyczne: bilet miesięczny, zamiana sklepów, limity, plan posiłków, itp.)
3) Policz “szacunkowo” ile można oszczędzić w miesiąc (widełki)
4) 1 pytanie doprecyzowujące

Pytanie usera: ${userText}
`.trim();
  }

  // CFO
  return `
Jesteś FinPilot — AI CFO. Mów po polsku jak kolega, bez wulgaryzmów. Tematy: budżet, rachunki, decyzje finansowe, oszczędzanie.
Jeśli user pyta o coś totalnie niezwiązanego, przekieruj na wersję finansową.

Kontekst:
- Miesiąc: ${mKey}
- Przychody: ${money(income)}
- Koszty: ${money(expense)}
- Netto: ${money(net)}
- Stan konta (deklaracja): ${money(state.balance)}
- Transakcje (max 18):
${txPreview || "(brak)"}

Format:
1) Najważniejszy wniosek (1 zdanie)
2) 3 kroki na tydzień
3) 1 ryzyko
4) 1 pytanie doprecyzowujące

Pytanie usera: ${userText}
`.trim();
}

async function askAI(){
  const q = (questionEl.value||"").trim();
  if (!q) return;

  pushChat("Ty", q);
  questionEl.value = "";

  const thinking = "Myślę…";
  pushChat("AI", thinking);

  try{
    const res = await fetch("/api/chat",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ message: buildAIMessage(q) })
    });
    const data = await res.json();

    // remove thinking
    state.chat = state.chat.filter(m=>m.text!==thinking);
    save();

    if (!res.ok){
      pushChat("AI", `Błąd AI: ${data?.error || "unknown"}`);
      return;
    }

    pushChat("AI", data.reply || "Brak odpowiedzi AI.");
  }catch(e){
    state.chat = state.chat.filter(m=>m.text!==thinking);
    save();
    pushChat("AI","Brak połączenia z /api/chat (sprawdź deploy na Vercel).");
  }
}

btnAsk?.addEventListener("click", askAI);
questionEl?.addEventListener("keydown",(e)=>{ if (e.key==="Enter") askAI(); });

// =====================
// Init
// =====================
load();
if (tDate) tDate.value = todayISO();
showTab("budget");
renderAll();
