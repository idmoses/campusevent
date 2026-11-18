import { mountShell, esc, fmtDate, errorState } from "../utils/layout.js";
import { supabase } from "../config/supabase.js";

const shell = await mountShell({ area: "admin", title: "Reports & Analytics" });
const PAL = ["#2563EB", "#06B6D4", "#14213D", "#64748B", "#60A5FA", "#0891B2", "#94A3B8", "#1D4ED8"];
const charts = {};
const draw = (id, config) => { charts[id]?.destroy(); charts[id] = new Chart(document.getElementById(id), { ...config, options: { responsive: true, maintainAspectRatio: false, ...config.options } }); };
const bar = (id, items, label, horizontal = false) => draw(id, { type: "bar", data: { labels: items.map((i) => i.name), datasets: [{ label, data: items.map((i) => Number(i.n)), backgroundColor: PAL[0], borderRadius: 6 }] }, options: { indexAxis: horizontal ? "y" : "x", plugins: { legend: { display: false } } } });

if (shell) {
  const { main } = shell;
  main.innerHTML = `<div class="card-soft p-3 mb-3 d-flex flex-wrap gap-2 align-items-center"><select class="form-select w-auto" id="range"><option value="7">Last 7 days</option><option value="30" selected>Last 30 days</option><option value="90">Last 90 days</option><option value="year">This year</option><option value="custom">Custom range</option></select>
    <input class="form-control w-auto d-none" type="date" id="from"><input class="form-control w-auto d-none" type="date" id="to"><button class="btn btn-primary" id="apply">Apply</button></div>
    <div id="out"></div>
    <p class="small text-muted mt-4">Registrations count non-cancelled sign-ups made in the selected period. Eligible registrations are those whose event has already ended. Attendance rate = present ÷ eligible; no-show rate = absent ÷ eligible.</p>`;
  const $ = (id) => document.getElementById(id);
  $("range").addEventListener("change", () => ["from", "to"].forEach((i) => $(i).classList.toggle("d-none", $("range").value !== "custom")));
  const span = () => {
    const v = $("range").value, to = new Date();
    if (v === "custom") { if (!$("from").value || !$("to").value) throw new Error("Pick both dates."); return [new Date($("from").value), new Date(new Date($("to").value).setHours(23, 59, 59))]; }
    const from = v === "year" ? new Date(to.getFullYear(), 0, 1) : new Date(to - Number(v) * 864e5);
    return [from, to];
  };
  const group = (daily, mode) => {
    const m = new Map();
    for (const d of daily) {
      let k = d.day;
      if (mode === "month") k = d.day.slice(0, 7);
      if (mode === "week") { const x = new Date(d.day); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); k = x.toISOString().slice(0, 10); }
      m.set(k, (m.get(k) ?? 0) + Number(d.n));
    }
    return [...m.entries()].sort();
  };
  async function run() {
    const out = $("out");
    try {
      const [from, to] = span();
      out.innerHTML = '<div class="skeleton" style="height:120px"></div>';
      const { data: d, error } = await supabase.rpc("analytics_summary", { p_from: from.toISOString(), p_to: to.toISOString() });
      if (error) throw new Error(error.message + " (run database/patch_stage6.sql)");
      const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : "–");
      const kpi = (l, v) => `<div class="col-6 col-xl"><div class="card-soft stat-card"><div><div class="num">${v}</div><div class="lbl">${l}</div></div></div></div>`;
      const box = (title, id, h = 260, col = "col-lg-6") => `<div class="${col}"><div class="card-soft p-3"><h3 class="h6">${title}</h3><div style="height:${h}px"><canvas id="${id}"></canvas></div></div></div>`;
      out.innerHTML = `<div class="row g-3">${kpi("Events in period", d.events)}${kpi("Registrations", d.registrations)}${kpi("Attendance rate", pct(d.attended, d.eligible))}${kpi("No-show rate", pct(d.eligible - d.attended, d.eligible))}${kpi("Avg. rating", d.avg_rating ?? "–")}</div>
        <div class="row g-3 mt-1"><div class="col-12"><div class="card-soft p-3"><div class="d-flex justify-content-between"><h3 class="h6">Registration trends</h3><select class="form-select form-select-sm w-auto" id="grp"><option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option></select></div><div style="height:260px"><canvas id="cTrend"></canvas></div></div></div>
        ${box("Attendance", "cAtt")}${box("Popular categories", "cCat")}${box("Registrations by faculty", "cFac")}${box("Registrations by department", "cDep")}${box("Rating distribution", "cRate")}
        <div class="col-lg-6"><div class="card-soft p-3 h-100"><h3 class="h6">Peak registration days</h3>${[...d.daily].sort((a, b) => b.n - a.n).slice(0, 5).map((x) => `<div class="d-flex justify-content-between small py-1 border-bottom"><span>${fmtDate(x.day)}</span><b>${x.n}</b></div>`).join("") || '<p class="text-muted small">No data.</p>'}</div></div>
        <div class="col-lg-6"><div class="card-soft p-3 h-100"><h3 class="h6">Top events</h3>${d.top_events.map((e) => `<div class="d-flex justify-content-between small py-1 border-bottom"><span>${esc(e.title)}</span><span>${e.regs} reg · ${e.attended} att · ${e.rating ?? "–"}★</span></div>`).join("") || '<p class="text-muted small">No data.</p>'}</div></div>
        <div class="col-lg-6"><div class="card-soft p-3 h-100"><h3 class="h6">Most active students</h3>${d.top_students.map((s) => `<div class="d-flex justify-content-between small py-1 border-bottom"><span>${esc(s.name)}</span><b>${s.n}</b></div>`).join("") || '<p class="text-muted small">No data.</p>'}</div></div></div>`;
      const trend = () => { const g = group(d.daily, $("grp").value); draw("cTrend", { type: "line", data: { labels: g.map((x) => x[0]), datasets: [{ label: "Registrations", data: g.map((x) => x[1]), borderColor: PAL[0], backgroundColor: "rgba(37,99,235,.12)", fill: true, tension: .3 }] }, options: { plugins: { legend: { display: false } } } }); };
      $("grp").addEventListener("change", trend); trend();
      const absent = d.eligible - d.attended;
      draw("cAtt", { type: "doughnut", data: { labels: ["Attended", "Absent"], datasets: [{ data: [d.attended, absent], backgroundColor: [PAL[0], "#CBD5E1"] }] } });
      draw("cCat", { type: "doughnut", data: { labels: d.categories.map((c) => c.name), datasets: [{ data: d.categories.map((c) => Number(c.n)), backgroundColor: PAL }] } });
      bar("cFac", d.faculties, "Registrations", true); bar("cDep", d.departments, "Registrations", true);
      bar("cRate", [1, 2, 3, 4, 5].map((r) => ({ name: `${r}★`, n: d.ratings.find((x) => x.rating === r)?.n ?? 0 })), "Reviews");
    } catch (err) { out.innerHTML = `<div class="card-soft">${errorState(err.message)}</div>`; }
  }
  $("apply").addEventListener("click", run); run();
}
