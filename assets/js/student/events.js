import { mountShell, skeletons, emptyState, errorState } from "../utils/layout.js";
import { fetchEvents, fetchMine } from "../events/events-api.js";
import { eventCard } from "../events/events-ui.js";

const shell = await mountShell({ area: "student", title: "Explore Events" });
if (shell) {
  const { profile, main } = shell;
  main.innerHTML = `<div class="card-soft filter-bar mb-4">
    <input class="form-control" id="q" type="search" placeholder="Search events, venues…" aria-label="Search">
    <select class="form-select" id="cat" aria-label="Category"><option value="">All categories</option></select>
    <select class="form-select" id="when" aria-label="Date"><option value="">Any date</option><option value="7">Next 7 days</option><option value="30">Next 30 days</option></select>
    <select class="form-select" id="sort" aria-label="Sort"><option value="date">Soonest</option><option value="new">Newest</option><option value="pop">Most popular</option></select>
    <div class="form-check mb-0"><input class="form-check-input" type="checkbox" id="open"><label class="form-check-label small" for="open">Open only</label></div></div>
    <div class="row g-3" id="grid">${skeletons(6)}</div>`;
  const grid = document.getElementById("grid");
  try {
    const [events, mine] = await Promise.all([fetchEvents(), fetchMine(profile.id)]);
    const regOf = new Map(mine.regs.map((r) => [r.event_id, r]));
    const upcoming = events.filter((e) => new Date(e.end_date) >= Date.now());
    const cats = [...new Set(upcoming.map((e) => e.categories?.name).filter(Boolean))].sort();
    document.getElementById("cat").insertAdjacentHTML("beforeend", cats.map((c) => `<option>${c}</option>`).join(""));
    const apply = () => {
      const q = document.getElementById("q").value.trim().toLowerCase(), cat = document.getElementById("cat").value;
      const days = Number(document.getElementById("when").value), sort = document.getElementById("sort").value;
      const onlyOpen = document.getElementById("open").checked;
      let list = upcoming.filter((e) =>
        (!q || `${e.title} ${e.venue} ${e.description ?? ""}`.toLowerCase().includes(q)) &&
        (!cat || e.categories?.name === cat) &&
        (!days || new Date(e.start_date) - Date.now() <= days * 864e5) &&
        (!onlyOpen || (e.left > 0 && Date.now() <= new Date(e.registration_deadline ?? e.start_date))));
      list.sort((a, b) => sort === "pop" ? b.taken - a.taken : sort === "new" ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.start_date) - new Date(b.start_date));
      grid.innerHTML = list.length ? list.map((e) => eventCard(e, regOf.get(e.id))).join("") : `<div class="col-12 card-soft">${emptyState("bi-search", "No events match", "Try clearing a filter or searching for something else.")}</div>`;
    };
    document.querySelector(".filter-bar").addEventListener("input", apply);
    apply();
  } catch (err) { grid.innerHTML = `<div class="col-12 card-soft">${errorState(err.message)}</div>`; }
}
