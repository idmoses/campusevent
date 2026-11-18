import { mountShell, fmtDate, skeletons, emptyState, errorState } from "../utils/layout.js";
import { fetchEvents, fetchMine, cancel } from "../events/events-api.js";
import { eventRow } from "../events/events-ui.js";
import { toast } from "../utils/ui.js";

const shell = await mountShell({ area: "student", title: "My Events" });
if (shell) load();

async function load() {
  const { profile, main } = shell;
  main.innerHTML = `<div class="row g-3">${skeletons(2, 120)}</div>`;
  try {
    const [events, mine] = await Promise.all([fetchEvents(), fetchMine(profile.id)]);
    const byId = new Map(events.map((e) => [e.id, e]));
    const rows = mine.regs.map((r) => ({ r, e: byId.get(r.event_id) })).filter((x) => x.e);
    const now = Date.now();
    const upcoming = rows.filter((x) => x.r.status === "registered" && new Date(x.e.start_date) > now);
    const history = rows.filter((x) => !upcoming.includes(x)).sort((a, b) => new Date(b.e.start_date) - new Date(a.e.start_date));
    const badge = (x) => x.r.status === "cancelled" ? '<span class="badge text-bg-secondary">Cancelled</span>' : new Date(x.e.end_date) < now ? '<span class="badge text-bg-light border">Completed</span>' : '<span class="badge text-bg-success">Registered</span>';
    main.innerHTML = `<h2 class="h4 mb-3">Upcoming</h2><div class="card-soft mb-4">${upcoming.length ? upcoming.map((x) => eventRow(x.e, `<code class="fw-bold">${x.r.registration_code}</code><button class="btn btn-sm btn-outline-danger" data-cancel="${x.e.id}">Cancel</button>`)).join("") : emptyState("bi-ticket-perforated", "No upcoming registrations", "Explore events to register.", '<a class="btn btn-primary btn-sm" href="events.html">Explore events</a>')}</div>
      <h2 class="h4 mb-3">History</h2><div class="card-soft">${history.length ? history.map((x) => eventRow(x.e, badge(x))).join("") : emptyState("bi-clock-history", "No history yet", "Past and cancelled registrations appear here.")}</div>`;
    main.querySelectorAll("[data-cancel]").forEach((b) => b.addEventListener("click", async () => {
      const c = await Swal.fire({ title: "Cancel registration?", icon: "question", showCancelButton: true });
      if (!c.isConfirmed) return;
      const { error } = await cancel(b.dataset.cancel);
      error ? toast("error", error.message) : (toast("success", "Registration cancelled."), load());
    }));
  } catch (err) { main.innerHTML = `<div class="card-soft">${errorState(err.message)}</div>`; }
}
