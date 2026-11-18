import { mountShell, esc, fmtTime, emptyState, errorState } from "../utils/layout.js";
import { supabase } from "../config/supabase.js";
import { downloadCsv } from "../utils/csv.js";
import { toast, setLoading, clean } from "../utils/ui.js";

const shell = await mountShell({ area: "admin", title: "Attendance" });
if (shell) {
  const { main } = shell;
  const { data: events, error } = await supabase.from("events").select("id, title, start_date").neq("status", "draft").order("start_date", { ascending: false });
  if (error) main.innerHTML = `<div class="card-soft">${errorState(error.message)}</div>`;
  else {
    main.innerHTML = `<div class="row g-4"><div class="col-lg-4"><div class="card-soft p-4"><h2 class="h5">Check in a student</h2><p class="small text-muted">Enter the student's registration code (shown on their event page).</p>
      <form id="ciForm"><input class="form-control form-control-lg mb-3 text-uppercase" id="code" maxlength="12" placeholder="e.g. 9F3A1C7B2D" autocomplete="off" required><button class="btn btn-primary w-100" id="ciBtn" type="submit">Validate &amp; check in</button></form></div></div>
      <div class="col-lg-8"><div class="card-soft p-4"><div class="d-flex gap-2 mb-3"><select class="form-select" id="evSel"><option value="">Select an event…</option>${events.map((e) => `<option value="${e.id}">${esc(e.title)}</option>`).join("")}</select><button class="btn btn-outline-primary" id="csv"><i class="bi bi-download"></i></button></div><div id="list">${emptyState("bi-qr-code-scan", "Choose an event", "Attendance and absentees appear here.")}</div></div></div></div>`;
    const sel = document.getElementById("evSel"); let rows = [];
    async function loadEvent() {
      if (!sel.value) return;
      const [regs, att] = await Promise.all([
        supabase.from("registrations").select("student_id, registration_code, profiles(full_name, student_id, department)").eq("event_id", sel.value).eq("status", "registered"),
        supabase.from("attendance").select("student_id, check_in_time").eq("event_id", sel.value).eq("status", "present"),
      ]);
      if (regs.error || att.error) return toast("error", (regs.error || att.error).message);
      const at = new Map(att.data.map((a) => [a.student_id, a.check_in_time]));
      rows = regs.data.map((r) => ({ ...r, present: at.has(r.student_id), time: at.get(r.student_id) }));
      const present = rows.filter((r) => r.present).length;
      document.getElementById("list").innerHTML = `<div class="d-flex gap-3 mb-3"><span class="badge text-bg-success">${present} present</span><span class="badge text-bg-secondary">${rows.length - present} not checked in</span></div>` +
        (rows.length ? `<div class="table-responsive"><table class="table align-middle mb-0"><tbody>${rows.map((r) => `<tr><td><div class="fw-semibold">${esc(r.profiles?.full_name)}</div><div class="small text-muted">${esc(r.profiles?.student_id)} · ${esc(r.profiles?.department)}</div></td>
          <td>${r.present ? `<span class="badge text-bg-success">Present ${fmtTime(r.time)}</span>` : '<span class="badge text-bg-secondary">Absent</span>'}</td>
          <td class="text-end">${r.present ? "" : `<button class="btn btn-sm btn-outline-primary" data-mark="${r.student_id}">Mark present</button>`}</td></tr>`).join("")}</tbody></table></div>` : emptyState("bi-people", "No registrations", "Nobody has registered for this event."));
      document.querySelectorAll("[data-mark]").forEach((b) => b.addEventListener("click", async () => {
        const c = await Swal.fire({ title: "Mark present manually?", text: "This is recorded under your account.", icon: "question", showCancelButton: true });
        if (!c.isConfirmed) return;
        const { error } = await supabase.rpc("mark_attendance", { p_event_id: sel.value, p_student_id: b.dataset.mark });
        error ? toast("error", error.message) : (toast("success", "Marked present."), loadEvent());
      }));
    }
    sel.addEventListener("change", loadEvent);
    document.getElementById("csv").addEventListener("click", () => downloadCsv("attendance-report.csv", rows.map((r) => ({ student: r.profiles?.full_name, student_id: r.profiles?.student_id, department: r.profiles?.department, status: r.present ? "present" : "absent", check_in_time: r.time ?? "" }))) || toast("info", "Select an event first."));
    const form = document.getElementById("ciForm"), btn = document.getElementById("ciBtn");
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); setLoading(btn, true);
      const { data, error } = await supabase.rpc("check_in", { p_code: clean(document.getElementById("code").value) });
      setLoading(btn, false, "Validate &amp; check in");
      if (error) return toast("error", error.message);
      toast("success", `Checked in: ${data.student}`); form.reset();
      if (sel.value === data.event_id) loadEvent();
    });
  }
}
