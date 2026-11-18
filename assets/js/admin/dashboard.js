import { mountShell, esc, fmtDate, fmtTime, emptyState, errorState } from "../utils/layout.js";
import { supabase } from "../config/supabase.js";

const shell = await mountShell({ area: "admin", title: "Overview" });
if (shell) {
  const { profile, main } = shell;
  const count = (t, f) => { const q = supabase.from(t).select("*", { count: "exact", head: true }); return f ? f(q) : q; };
  const nowIso = new Date().toISOString();
  main.innerHTML = '<div class="row g-3">' + Array(6).fill('<div class="col-6 col-xl-4"><div class="skeleton" style="height:88px"></div></div>').join("") + "</div>";
  try {
    const [ev, rg, at, st, up, rv, recent, next] = await Promise.all([
      count("events"), count("registrations", (q) => q.eq("status", "registered")),
      count("attendance", (q) => q.eq("status", "present")), count("profiles", (q) => q.eq("role", "student")),
      count("events", (q) => q.eq("status", "published").gte("start_date", nowIso)),
      supabase.from("event_reviews").select("rating"),
      supabase.from("registrations").select("registered_at, status, profiles(full_name), events(title)").order("registered_at", { ascending: false }).limit(6),
      supabase.from("events").select("id, title, start_date, venue, capacity, status").gte("start_date", nowIso).order("start_date").limit(6),
    ]);
    for (const r of [ev, rg, at, st, up, rv, recent, next]) if (r.error) throw r.error;
    const avg = rv.data.length ? (rv.data.reduce((s, r) => s + r.rating, 0) / rv.data.length).toFixed(1) : "–";
    const stat = (icon, n, l) => `<div class="col-6 col-xl-4"><div class="card-soft stat-card"><div class="stat-icon"><i class="bi ${icon}"></i></div><div><div class="num">${n}</div><div class="lbl">${l}</div></div></div></div>`;
    main.innerHTML = `<h2 class="h3 mb-1">Hello, ${esc(profile.full_name.split(" ")[0])}</h2><p class="text-muted mb-4">Platform overview, live from the database.</p>
      <div class="row g-3">${stat("bi-calendar2-event", ev.count, "Total events")}${stat("bi-people", rg.count, "Active registrations")}${stat("bi-patch-check", at.count, "Total attendance")}${stat("bi-star", avg, "Average event rating")}${stat("bi-mortarboard", st.count, "Total students")}${stat("bi-calendar-check", up.count, "Upcoming events")}</div>
      <div class="row g-4"><div class="col-lg-6"><div class="section-head"><h2>Upcoming events</h2></div><div class="card-soft">${next.data.length ? next.data.map((e) => `<div class="list-row"><div class="flex-grow-1"><div class="fw-semibold">${esc(e.title)}</div><div class="small text-muted">${fmtDate(e.start_date)} · ${fmtTime(e.start_date)} · ${esc(e.venue)}</div></div><span class="badge text-bg-${e.status === "published" ? "success" : "secondary"}">${e.status}</span></div>`).join("") : emptyState("bi-calendar-x", "No upcoming events", "Created events will be listed here.")}</div></div>
      <div class="col-lg-6"><div class="section-head"><h2>Recent registrations</h2></div><div class="card-soft">${recent.data.length ? recent.data.map((r) => `<div class="list-row"><div class="flex-grow-1"><div class="fw-semibold">${esc(r.profiles?.full_name ?? "Student")}</div><div class="small text-muted">${esc(r.events?.title ?? "")} · ${fmtDate(r.registered_at)}</div></div><span class="badge text-bg-${r.status === "registered" ? "success" : "secondary"}">${r.status}</span></div>`).join("") : emptyState("bi-people", "No registrations yet", "New sign-ups will appear here.")}</div></div></div>`;
  } catch (err) { main.innerHTML = `<div class="card-soft">${errorState(err.message)}</div>`; }
}
