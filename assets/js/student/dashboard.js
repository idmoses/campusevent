import { mountShell, esc, fmtDate, skeletons, emptyState, errorState } from "../utils/layout.js";
import { fetchEvents, fetchMine } from "../events/events-api.js";
import { eventCard, eventRow } from "../events/events-ui.js";

const shell = await mountShell({ area: "student", title: "Dashboard" });
if (shell) render(shell);

async function render({ profile, main }) {
  const first = profile.full_name.split(" ")[0] || "there";
  const head = `<div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
    <div><h2 class="h3 mb-1">Welcome back, ${esc(first)}</h2><p class="text-muted mb-0">Here is what is happening on campus.</p></div>
    <div class="d-flex flex-wrap gap-2">
      <a class="btn btn-primary" href="events.html"><i class="bi bi-compass me-1"></i>Explore Events</a>
      <a class="btn btn-outline-primary" href="my-events.html">My Registrations</a>
      <a class="btn btn-outline-primary" href="saved-events.html">Saved Events</a>
      <a class="btn btn-outline-primary" href="profile.html">My Profile</a></div></div>`;
  main.innerHTML = head + `<div class="row g-3">${skeletons(4, 88).replaceAll("col-md-6 col-xl-4", "col-6 col-xl-3")}</div>`;
  try {
    const [events, mine] = await Promise.all([fetchEvents(), fetchMine(profile.id)]);
    const now = Date.now(), byId = new Map(events.map((e) => [e.id, e]));
    const regOf = new Map(mine.regs.map((r) => [r.event_id, r]));
    const upcoming = events.filter((e) => new Date(e.end_date) >= now);
    const myUpcoming = upcoming.filter((e) => regOf.get(e.id)?.status === "registered");
    const saved = [...mine.saved].map((id) => byId.get(id)).filter(Boolean);
    const recs = upcoming.filter((e) => regOf.get(e.id)?.status !== "registered" && e.left > 0).sort((a, b) => b.taken - a.taken).slice(0, 3);
    const recent = [...mine.regs].sort((a, b) => new Date(b.registered_at) - new Date(a.registered_at)).slice(0, 5);
    const stat = (icon, n, l) => `<div class="col-6 col-xl-3"><div class="card-soft stat-card"><div class="stat-icon"><i class="bi ${icon}"></i></div><div><div class="num">${n}</div><div class="lbl">${l}</div></div></div></div>`;
    const activity = recent.map((r) => {
      const e = byId.get(r.event_id);
      return e ? `<div class="list-row"><i class="bi ${r.status === "registered" ? "bi-check-circle text-success" : "bi-x-circle text-secondary"}"></i><div class="flex-grow-1"><div class="small fw-semibold">${r.status === "registered" ? "Registered for" : "Cancelled"} ${esc(e.title)}</div><div class="small text-muted">${fmtDate(r.registered_at)}</div></div></div>` : "";
    }).join("");
    main.innerHTML = head + `
      <div class="row g-3">${stat("bi-ticket-perforated", myUpcoming.length, "Upcoming registrations")}${stat("bi-bookmark", saved.length, "Saved events")}${stat("bi-patch-check", mine.attended, "Events attended")}${stat("bi-calendar-event", upcoming.length, "Upcoming on campus")}</div>
      <div class="section-head"><h2>Upcoming events</h2><a href="events.html" class="small">View all</a></div>
      <div class="row g-3">${upcoming.length ? upcoming.slice(0, 3).map((e) => eventCard(e, regOf.get(e.id))).join("") : `<div class="col-12 card-soft">${emptyState("bi-calendar-x", "No upcoming events", "Check back soon, new events are added regularly.")}</div>`}</div>
      <div class="row g-4 mt-1">
        <div class="col-lg-6"><div class="section-head mt-3"><h2>My registrations</h2></div><div class="card-soft">${myUpcoming.length ? myUpcoming.slice(0, 5).map((e) => eventRow(e, `<span class="badge text-bg-success">${esc(regOf.get(e.id).registration_code)}</span>`)).join("") : emptyState("bi-ticket-perforated", "No registrations yet", "Register for an event to see it here.")}</div></div>
        <div class="col-lg-6"><div class="section-head mt-3"><h2>Saved events</h2></div><div class="card-soft">${saved.length ? saved.slice(0, 5).map((e) => eventRow(e)).join("") : emptyState("bi-bookmark", "Nothing saved", "Save events to find them quickly later.")}</div></div>
      </div>
      <div class="section-head"><h2>Recommended for you</h2></div>
      <div class="row g-3">${recs.length ? recs.map((e) => eventCard(e, regOf.get(e.id))).join("") : `<div class="col-12 card-soft">${emptyState("bi-stars", "No recommendations right now", "You are all caught up.")}</div>`}</div>
      <div class="section-head"><h2>Recent activity</h2></div>
      <div class="card-soft">${activity || emptyState("bi-activity", "No activity yet", "Your registrations will show up here.")}</div>`;
  } catch (err) {
    main.innerHTML = head + `<div class="card-soft">${errorState(err.message)}</div>`;
  }
}
