import { mountShell, skeletons, emptyState, errorState } from "../utils/layout.js";
import { fetchEvents, fetchMine } from "../events/events-api.js";
import { eventCard } from "../events/events-ui.js";

const shell = await mountShell({ area: "student", title: "Saved Events" });
if (shell) {
  const { profile, main } = shell;
  main.innerHTML = `<div class="row g-3">${skeletons(3)}</div>`;
  try {
    const [events, mine] = await Promise.all([fetchEvents(), fetchMine(profile.id)]);
    const regOf = new Map(mine.regs.map((r) => [r.event_id, r]));
    const saved = events.filter((e) => mine.saved.has(e.id));
    main.innerHTML = saved.length ? `<div class="row g-3">${saved.map((e) => eventCard(e, regOf.get(e.id))).join("")}</div>`
      : `<div class="card-soft">${emptyState("bi-bookmark", "No saved events", "Tap Save on any event to keep it here.", '<a class="btn btn-primary btn-sm" href="events.html">Explore events</a>')}</div>`;
  } catch (err) { main.innerHTML = `<div class="card-soft">${errorState(err.message)}</div>`; }
}
