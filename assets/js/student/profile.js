import { mountShell, esc } from "../utils/layout.js";
import { supabase } from "../config/supabase.js";
import { toast, setLoading, clean } from "../utils/ui.js";

const shell = await mountShell({ area: "student", title: "Profile" });
if (shell) {
  const { profile: p, main } = shell;
  const f = (id, label, val, ro = false, type = "text") => `<div class="col-md-6"><label class="form-label" for="${id}">${label}</label><input class="form-control" id="${id}" type="${type}" value="${esc(val)}" ${ro ? "readonly" : ""}></div>`;
  main.innerHTML = `<div class="card-soft p-4" style="max-width:760px"><h2 class="h5 mb-3">Personal information</h2>
    <form id="profileForm" novalidate><div class="row g-3">
    ${f("full_name", "Full name", p.full_name)}${f("email", "Email", p.email, true)}${f("student_id", "Student ID", p.student_id, true)}${f("phone", "Phone number", p.phone, false, "tel")}
    ${f("faculty", "Faculty", p.faculty)}${f("department", "Department", p.department)}${f("level", "Level", p.level)}
    <div class="col-12"><button class="btn btn-primary" id="saveBtn" type="submit">Save changes</button></div></div></form></div>`;
  const form = document.getElementById("profileForm"), btn = document.getElementById("saveBtn");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = Object.fromEntries(["full_name", "phone", "faculty", "department", "level"].map((k) => [k, clean(form[k].value)]));
    if (!v.full_name) return toast("warning", "Full name is required.");
    setLoading(btn, true);
    const { error } = await supabase.from("profiles").update(v).eq("id", p.id);
    setLoading(btn, false, "Save changes");
    error ? toast("error", error.message) : toast("success", "Profile updated.");
  });
}
