// ====== STATE ======
let transactions = [];

// ====== ELEMENTS ======
const csvEl = document.getElementById("csv");
const statusEl = document.getElementById("status");
const incomeEl = document.getElementById("income");
const expenseEl = document.getElementById("expense");
const netEl = document.getElementById("net");
const chartEl = document.getElementById("chart");
const chatEl = document.getElementById("chat");
const questionEl = document.getElementById("question");

document.getElementById("btnImport").onclick = importCSV;
document.getElementById("btnAsk").onclick = askCFO;

// ====== CSV IMPORT ======
function importCSV() {
  const text = csvEl.value.trim();
  if (!text) {
    statusEl.textContent = "Wklej CSV.";
    return;
  }

  const lines = text.split("\n").slice(1);
  transactions = lines.map(l => {
    const [date, desc, amount] = l.split(",");
    return { date, desc, amount: Number(amount) };
  }).filter(t => !isNaN(t.amount));

  statusEl.textContent = `Zaimportowano ${transactions.length} transakcji`;
  render();
}

// ====== RENDER ======
let chart;

function render() {
  const income = transactions.filter(t=>t.amount>0).reduce((a,b)=>a+b.amount,0);
  const expense = transactions.filter(t=>t.amount<0).reduce((a,b)=>a+Math.abs(b.amount),0);
  const net = income - expense;

  incomeEl.textContent = income.toFixed(2);
  expenseEl.textContent = expense.toFixed(2);
  netEl.textContent = net.toFixed(2);

  renderChart();
}

function renderChart() {
  const byMonth = {};
  transactions.forEach(t => {
    const m = t.date.slice(0,7);
    byMonth[m] = (byMonth[m] || 0) + t.amount;
  });

  const labels = Object.keys(byMonth);
  const data = Object.values(byMonth);

  if (chart) chart.destroy();
  chart = new Chart(chartEl, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Netto / miesiąc",
        data,
        borderWidth: 2
      }]
    },
    options: {
      plugins: { legend: { display:false } }
    }
  });
}

// ====== CFO CHAT (offline AI logic) ======
function askCFO() {
  const q = questionEl.value.trim().toLowerCase();
  if (!q) return;

  pushMsg("Ty", questionEl.value);

  const income = transactions.filter(t=>t.amount>0).reduce((a,b)=>a+b.amount,0);
  const expense = transactions.filter(t=>t.amount<0).reduce((a,b)=>a+Math.abs(b.amount),0);
  const net = income - expense;
  const safe = net * 0.35;

  let answer =
    `Twoje netto: ${net.toFixed(2)}.\n` +
    `Bezpieczny jednorazowy wydatek: ~${safe.toFixed(2)}.`;

  if (q.includes("urlop")) {
    answer += "\nUrlop jest OK, jeśli mieści się w tym limicie.";
  }

  pushMsg("CFO", answer);
  questionEl.value = "";
}

function pushMsg(who, text) {
  const div = document.createElement("div");
  div.className = "msg";
  div.innerHTML = `<b>${who}:</b> ${text.replace(/\n/g,"<br>")}`;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}
