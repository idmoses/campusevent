import { mountShell, esc, fmtDate, fmtTime, skeletons, emptyState, errorState } from "../utils/layout.js";
import { supabase } from "../config/supabase.js";
import { toast } from "../utils/ui.js";

const shell = await mountShell({ area: "admin", title: "Manage Events" });
if (shell) load();

async function load() {
  const { main } = shell;
  main.innerHTML = `<div class="row g-3">${skeletons(2, 90)}</div>`;
  try {
    const [ev, seats] = await Promise.all([
      supabase.from("events").select("*, categories(name)").order("start_date", { ascending: false }),
      supabase.from("event_seats").select("event_id, taken"),
    ]);
    if (ev.error) throw ev.error;
    const taken = new Map((seats.data ?? []).map((s) => [s.event_id, Number(s.taken)]));
    const tone = { published: "success", draft: "warning", archived: "secondary", cancelled: "danger" };
    const rows = ev.data.map((e) => `<tr><td><div class="fw-semibold">${esc(e.title)}</div><div class="small text-muted">${esc(e.categories?.name ?? "General")} · ${esc(e.venue)}</div></td>
      <td class="small">${fmtDate(e.start_date)}<br>${fmtTime(e.start_date)}</td><td>${taken.get(e.id) ?? 0} / ${e.capacity}</td>
      <td><span class="badge text-bg-${tone[e.status]}">${e.status}</span></td>
      <td class="text-end text-nowrap"><a class="btn btn-sm btn-outline-primary" href="create-event.html?id=${e.id}">Edit</a>
        <button class="btn btn-sm btn-outline-secondary" data-act="${e.status === "published" ? "draft" : "published"}" data-id="${e.id}">${e.status === "published" ? "Unpublish" : "Publish"}</button>
        ${e.status !== "archived" ? `<button class="btn btn-sm btn-outline-secondary" data-act="archived" data-id="${e.id}">Archive</button>` : ""}
        <button class="btn btn-sm btn-outline-danger" data-act="delete" data-id="${e.id}">Delete</button></td></tr>`).join("");
    main.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h4 mb-0">All events</h2><a class="btn btn-primary" href="create-event.html"><i class="bi bi-plus-lg me-1"></i>Create event</a></div>
      <div class="card-soft">${ev.data.length ? `<div class="table-responsive"><table class="table align-middle mb-0"><thead><tr><th>Event</th><th>Date</th><th>Seats</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : emptyState("bi-calendar-plus", "No events yet", "Create your first event to get started.", '<a class="btn btn-primary btn-sm" href="create-event.html">Create event</a>')}</div>`;
    main.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => act(b.dataset.act, b.dataset.id)));
  } catch (err) { main.innerHTML = `<div class="card-soft">${errorState(err.message)}</div>`; }
}

async function act(action, id) {
  if (action === "delete") {
    const c = await Swal.fire({ title: "Delete this event?", text: "All its registrations and attendance are deleted too. Archive instead to keep history.", icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", confirmButtonText: "Delete" });
    if (!c.isConfirmed) return;
  }
  const { error } = action === "delete" ? await supabase.from("events").delete().eq("id", id) : await supabase.from("events").update({ status: action }).eq("id", id);
  error ? toast("error", error.message) : (toast("success", "Done."), load());
}
