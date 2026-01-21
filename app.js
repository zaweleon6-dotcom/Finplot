// ===== STATE =====
let transactions = [];

// ===== ELEMENTS =====
const csvEl = document.getElementById("csv");
const btnImport = document.getElementById("btnImport");
const statusEl = document.getElementById("status");

const incomeEl = document.getElementById("income");
const expenseEl = document.getElementById("expense");
const netEl = document.getElementById("net");

const chatEl = document.getElementById("chat");
const questionEl = document.getElementById("question");
const btnAsk = document.getElementById("btnAsk");
const modeEl = document.getElementById("mode");

const decisionEl = document.getElementById("decision");
const decisionStatus = decisionEl
  ? decisionEl.querySelector(".decision-status")
  : null;
const decisionText = decisionEl
  ? decisionEl.querySelector(".decision-text")
  : null;

// ===== HELPERS =====
function pushMsg(author, text) {
  const div = document.createElement("div");
  div.className = "msg";
  div.innerHTML = `<b>${author}:</b> ${text}`;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// ===== CSV IMPORT =====
btnImport.onclick = () => {
  const rows = csvEl.value.trim().split("\n");
  if (rows.length < 2) {
    statusEl.textContent = "CSV jest puste lub niepoprawne.";
    return;
  }

  transactions = [];

  rows.slice(1).forEach(r => {
    const [date, desc, amount] = r.split(",");
    const val = parseFloat(amount);
    if (!isNaN(val)) {
      transactions.push({ date, desc, amount: val });
    }
  });

  updateDashboard();
  statusEl.textContent = `Zaimportowano ${transactions.length} transakcji.`;
};

// ===== DASHBOARD =====
function updateDashboard() {
  const income = transactions
    .filter(t => t.amount > 0)
    .reduce((a, b) => a + b.amount, 0);

  const expense = transactions
    .filter(t => t.amount < 0)
    .reduce((a, b) => a + Math.abs(b.amount), 0);

  const net = income - expense;

  incomeEl.textContent = income.toFixed(0);
  expenseEl.textContent = expense.toFixed(0);
  netEl.textContent = net.toFixed(0);
}

// ===== AI CFO (FAKE, OFFLINE) =====
btnAsk.onclick = askCFO;

function askCFO() {
  const q = questionEl.value.trim();
  if (!q) return;

  pushMsg("Ty", q);
  questionEl.value = "";

  if (!transactions.length) {
    pushMsg("CFO", "Najpierw zaimportuj swoje finanse.");
    return;
  }

  const income = transactions
    .filter(t => t.amount > 0)
    .reduce((a, b) => a + b.amount, 0);

  const expense = transactions
    .filter(t => t.amount < 0)
    .reduce((a, b) => a + Math.abs(b.amount), 0);

  const net = income - expense;
  const safeBudget = net * 0.35;

  // reset decision
  if (decisionEl) {
    decisionEl.className = "decision";
  }

  // ===== TRYB WAKACJE =====
  if (modeEl.value === "vacation") {
    if (decisionEl) {
      decisionEl.classList.remove("hidden");

      if (safeBudget >= 3000) {
        decisionEl.classList.add("ok");
        decisionStatus.textContent = "✅ STAĆ CIĘ";
        decisionText.textContent =
          "Wakacje mieszczą się w bezpiecznym budżecie.";
      } else if (safeBudget >= 1500) {
        decisionEl.classList.add("warn");
        decisionStatus.textContent = "⚠️ RYZYKOWNE";
        decisionText.textContent =
          "Da się, ale ogranicz standard lub długość wyjazdu.";
      } else {
        decisionEl.classList.add("no");
        decisionStatus.textContent = "❌ NIE STAĆ CIĘ";
        decisionText.textContent =
          "Ten wyjazd zbyt mocno obciąży Twoje finanse.";
      }
    }

    pushMsg(
      "CFO",
      `Twoje netto: ${net.toFixed(
        0
      )}. Bezpieczny budżet wakacyjny: ~${safeBudget.toFixed(0)}.`
    );
    return;
  }

  // ===== TRYB CFO =====
  if (decisionEl) {
    decisionEl.classList.add("hidden");
  }

  pushMsg(
    "CFO",
    `Twoje miesięczne netto to ${net.toFixed(
      0
    )}. Bezpieczny jednorazowy wydatek to około ${safeBudget.toFixed(
      0
    )}.`
  );
}
