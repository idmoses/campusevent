import { mountShell, esc, fmtDate, skeletons, emptyState, errorState } from "../utils/layout.js";
import { supabase } from "../config/supabase.js";
import { toast } from "../utils/ui.js";

const shell = await mountShell({ area: "admin", title: "Students" });
if (shell) {
  const { profile, main } = shell;
  main.innerHTML = `<div class="row g-3">${skeletons(2, 90)}</div>`;
  const load = async () => {
    const { data, error } = await supabase.from("profiles").select("*").eq("role", "student").order("created_at", { ascending: false }).limit(1000);
    if (error) throw error; return data;
  };
  try {
    let all = await load();
    const opts = (k) => [...new Set(all.map((s) => s[k]).filter(Boolean))].sort().map((v) => `<option>${esc(v)}</option>`).join("");
    main.innerHTML = `<div class="card-soft filter-bar mb-3" style="grid-template-columns:2fr 1fr 1fr"><input class="form-control" id="q" type="search" placeholder="Search name, student ID, email…">
      <select class="form-select" id="fac"><option value="">All faculties</option>${opts("faculty")}</select><select class="form-select" id="dep"><option value="">All departments</option>${opts("department")}</select></div><div class="card-soft" id="tbl"></div>`;
    const draw = () => {
      const q = document.getElementById("q").value.trim().toLowerCase(), f = document.getElementById("fac").value, d = document.getElementById("dep").value;
      const list = all.filter((s) => (!f || s.faculty === f) && (!d || s.department === d) && (!q || [s.full_name, s.student_id, s.email].join(" ").toLowerCase().includes(q)));
      document.getElementById("tbl").innerHTML = list.length ? `<div class="table-responsive"><table class="table align-middle mb-0"><thead><tr><th>Student</th><th>Faculty / Dept</th><th>Level</th><th>Joined</th><th>Status</th><th></th></tr></thead><tbody>${list.map((s) => `<tr>
        <td><div class="fw-semibold">${esc(s.full_name)}</div><div class="small text-muted">${esc(s.student_id)} · ${esc(s.email)}</div></td><td class="small">${esc(s.faculty)}<br>${esc(s.department)}</td><td>${esc(s.level)}</td><td class="small">${fmtDate(s.created_at)}</td>
        <td><span class="badge text-bg-${s.is_active ? "success" : "danger"}">${s.is_active ? "Active" : "Suspended"}</span></td>
        <td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-primary" data-hist="${s.id}">History</button>${profile.role === "admin" ? ` <button class="btn btn-sm btn-outline-${s.is_active ? "danger" : "success"}" data-tog="${s.id}">${s.is_active ? "Suspend" : "Reactivate"}</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : emptyState("bi-mortarboard", "No students found", "Try a different search or filter.");
      document.querySelectorAll("[data-hist]").forEach((b) => b.addEventListener("click", () => history(b.dataset.hist)));
      document.querySelectorAll("[data-tog]").forEach((b) => b.addEventListener("click", async () => {
        const s = all.find((x) => x.id === b.dataset.tog);
        const c = await Swal.fire({ title: `${s.is_active ? "Suspend" : "Reactivate"} ${s.full_name}?`, icon: "warning", showCancelButton: true });
        if (!c.isConfirmed) return;
        const { error } = await supabase.from("profiles").update({ is_active: !s.is_active }).eq("id", s.id);
        if (error) return toast("error", error.message);
        all = await load(); draw(); toast("success", "Account updated.");
      }));
    };
    async function history(id) {
      const [r, a] = await Promise.all([supabase.from("registrations").select("status, events(title, start_date)").eq("student_id", id).order("registered_at", { ascending: false }), supabase.from("attendance").select("event_id").eq("student_id", id).eq("status", "present")]);
      if (r.error) return toast("error", r.error.message);
      Swal.fire({ title: "Participation history", html: `<p class="text-muted small">${r.data.length} registrations · ${a.data?.length ?? 0} attended</p>` + (r.data.map((x) => `<div class="text-start small py-1 border-bottom">${esc(x.events?.title)} <span class="text-muted">· ${fmtDate(x.events?.start_date)} · ${x.status}</span></div>`).join("") || "No registrations yet."), width: 560 });
    }
    main.querySelector(".filter-bar").addEventListener("input", draw); draw();
  } catch (err) { main.innerHTML = `<div class="card-soft">${errorState(err.message)}</div>`; }
}
