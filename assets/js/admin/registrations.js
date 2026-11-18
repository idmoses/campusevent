import { mountShell, esc, fmtDate, skeletons, emptyState, errorState } from "../utils/layout.js";
import { supabase } from "../config/supabase.js";
import { downloadCsv } from "../utils/csv.js";
import { toast } from "../utils/ui.js";

const shell = await mountShell({ area: "admin", title: "Registrations" });
if (shell) {
  const { profile, main } = shell;
  main.innerHTML = `<div class="row g-3">${skeletons(2, 90)}</div>`;
  let all = [];
  const load = async () => {
    const { data, error } = await supabase.from("registrations").select("id, event_id, registration_code, status, registered_at, profiles(full_name, student_id, email, department, faculty), events(title)").order("registered_at", { ascending: false }).limit(1000);
    if (error) throw error;
    all = data;
  };
  try {
    await load();
    const events = [...new Map(all.map((r) => [r.event_id, r.events?.title])).entries()];
    const depts = [...new Set(all.map((r) => r.profiles?.department).filter(Boolean))].sort();
    main.innerHTML = `<div class="card-soft filter-bar mb-3" style="grid-template-columns:2fr 1.5fr 1.5fr auto auto">
      <input class="form-control" id="q" type="search" placeholder="Search name, student ID, email, code…">
      <select class="form-select" id="ev"><option value="">All events</option>${events.map(([id, t]) => `<option value="${id}">${esc(t)}</option>`).join("")}</select>
      <select class="form-select" id="dept"><option value="">All departments</option>${depts.map((d) => `<option>${esc(d)}</option>`).join("")}</select>
      <select class="form-select" id="st"><option value="">Any status</option><option>registered</option><option>cancelled</option></select>
      <button class="btn btn-outline-primary" id="csv"><i class="bi bi-download me-1"></i>CSV</button></div><div class="card-soft" id="tbl"></div>`;
    let shown = [];
    const draw = () => {
      const q = document.getElementById("q").value.trim().toLowerCase(), ev = document.getElementById("ev").value, d = document.getElementById("dept").value, st = document.getElementById("st").value;
      shown = all.filter((r) => (!ev || r.event_id === ev) && (!d || r.profiles?.department === d) && (!st || r.status === st) &&
        (!q || [r.profiles?.full_name, r.profiles?.student_id, r.profiles?.email, r.registration_code].join(" ").toLowerCase().includes(q)));
      document.getElementById("tbl").innerHTML = shown.length ? `<div class="table-responsive"><table class="table align-middle mb-0"><thead><tr><th>Student</th><th>Event</th><th>Code</th><th>Registered</th><th>Status</th><th></th></tr></thead><tbody>${shown.map((r) => `<tr>
        <td><div class="fw-semibold">${esc(r.profiles?.full_name)}</div><div class="small text-muted">${esc(r.profiles?.student_id)} · ${esc(r.profiles?.department)}</div></td><td>${esc(r.events?.title)}</td><td><code>${esc(r.registration_code)}</code></td><td class="small">${fmtDate(r.registered_at)}</td>
        <td><span class="badge text-bg-${r.status === "registered" ? "success" : "secondary"}">${r.status}</span></td>
        <td class="text-end">${profile.role === "admin" && r.status === "registered" ? `<button class="btn btn-sm btn-outline-danger" data-cancel="${r.id}">Cancel</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : emptyState("bi-people", "No registrations found", "Adjust the filters or wait for new sign-ups.");
      document.querySelectorAll("[data-cancel]").forEach((b) => b.addEventListener("click", async () => {
        const c = await Swal.fire({ title: "Cancel this registration?", icon: "warning", showCancelButton: true });
        if (!c.isConfirmed) return;
        const { error } = await supabase.from("registrations").update({ status: "cancelled" }).eq("id", b.dataset.cancel);
        if (error) return toast("error", error.message);
        toast("success", "Registration cancelled."); await load(); draw();
      }));
    };
    main.querySelector(".filter-bar").addEventListener("input", draw);
    document.getElementById("csv").addEventListener("click", () => downloadCsv("registrations.csv", shown.map((r) => ({ student: r.profiles?.full_name, student_id: r.profiles?.student_id, email: r.profiles?.email, faculty: r.profiles?.faculty, department: r.profiles?.department, event: r.events?.title, code: r.registration_code, status: r.status, registered_at: r.registered_at }))) || toast("info", "Nothing to export."));
    draw();
  } catch (err) { main.innerHTML = `<div class="card-soft">${errorState(err.message)}</div>`; }
}
