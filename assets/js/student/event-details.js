import { mountShell, esc, fmtDate, fmtTime, errorState } from "../utils/layout.js";
import { supabase } from "../config/supabase.js";
import { fetchMine, register, cancel, toggleSave } from "../events/events-api.js";
import { availability } from "../events/events-ui.js";
import { toast } from "../utils/ui.js";

const shell = await mountShell({ area: "student", title: "Event details" });
const id = new URLSearchParams(location.search).get("id");
if (shell) load();

async function load() {
  const { profile, main } = shell;
  try {
    const [ev, seat, mine] = await Promise.all([
      supabase.from("events").select("*, categories(name)").eq("id", id).single(),
      supabase.from("event_seats").select("taken").eq("event_id", id).maybeSingle(),
      fetchMine(profile.id),
    ]);
    if (ev.error) throw new Error("Event not found.");
    const e = { ...ev.data, taken: Number(seat.data?.taken ?? 0) };
    e.left = e.capacity - e.taken;
    const reg = mine.regs.find((r) => r.event_id === id), isSaved = mine.saved.has(id);
    const [label, tone] = availability(e, reg);
    const registered = reg?.status === "registered", started = new Date(e.start_date) <= Date.now();
    const canReg = label === "Open";
    const row = (icon, t) => `<div class="meta mb-2"><i class="bi ${icon}"></i><span>${t}</span></div>`;
    main.innerHTML = `<a href="events.html" class="small text-decoration-none"><i class="bi bi-arrow-left"></i> Back to events</a>
      <div class="detail-cover my-3">${e.image_url ? `<img src="${esc(e.image_url)}" alt="">` : '<i class="bi bi-calendar-event"></i>'}</div>
      <div class="row g-4"><div class="col-lg-8"><span class="cat-pill">${esc(e.categories?.name ?? "General")}</span>
        <h2 class="h2 mt-2">${esc(e.title)}</h2><p class="text-muted" style="white-space:pre-line">${esc(e.description ?? "No description provided.")}</p></div>
      <div class="col-lg-4"><div class="card-soft p-4">
        <span class="badge text-bg-${tone} mb-3">${label}</span>
        ${row("bi-calendar3", `${fmtDate(e.start_date)}`)}${row("bi-clock", `${fmtTime(e.start_date)} – ${fmtTime(e.end_date)}`)}${row("bi-geo-alt", esc(e.venue))}
        ${row("bi-people", `${Math.max(e.left, 0)} of ${e.capacity} seats left`)}${row("bi-hourglass-split", `Register by ${fmtDate(e.registration_deadline ?? e.start_date)}`)}
        ${registered ? `<div class="mt-3"><div class="small text-muted mb-1">Your check-in code</div><div class="code-box">${esc(reg.registration_code)}</div></div>` : ""}
        <div class="d-grid gap-2 mt-3">
          ${registered ? `<button class="btn btn-outline-danger" id="cancelBtn" ${started ? "disabled" : ""}>Cancel registration</button>` : `<button class="btn btn-primary" id="regBtn" ${canReg ? "" : "disabled"}>Register for event</button>`}
          <button class="btn btn-outline-primary" id="saveBtn"><i class="bi ${isSaved ? "bi-bookmark-fill" : "bi-bookmark"} me-1"></i>${isSaved ? "Saved" : "Save event"}</button>
          <button class="btn btn-light" id="shareBtn"><i class="bi bi-share me-1"></i>Share</button></div></div></div></div>`;
    const run = async (fn, ok) => { const { error } = await fn(); if (error) toast("error", error.message); else { toast("success", ok); load(); } };
    document.getElementById("regBtn")?.addEventListener("click", () => run(() => register(id), "You are registered."));
    document.getElementById("cancelBtn")?.addEventListener("click", async () => {
      const c = await Swal.fire({ title: "Cancel registration?", icon: "question", showCancelButton: true, confirmButtonText: "Yes, cancel" });
      if (c.isConfirmed) run(() => cancel(id), "Registration cancelled.");
    });
    document.getElementById("saveBtn").addEventListener("click", () => run(() => toggleSave(profile.id, id, isSaved), isSaved ? "Removed from saved." : "Event saved."));
    document.getElementById("shareBtn").addEventListener("click", async () => {
      if (navigator.share) return navigator.share({ title: e.title, url: location.href }).catch(() => {});
      await navigator.clipboard.writeText(location.href); toast("success", "Link copied.");
    });
  } catch (err) { main.innerHTML = `<div class="card-soft">${errorState(err.message)}</div>`; }
}
