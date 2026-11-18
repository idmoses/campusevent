import { esc, fmtDate, fmtTime } from "../utils/layout.js";

export function availability(e, reg) {
  if (reg?.status === "registered") return ["Registered", "success"];
  if (e.left <= 0) return ["Full", "danger"];
  if (Date.now() > new Date(e.registration_deadline ?? e.start_date)) return ["Closed", "secondary"];
  return ["Open", "primary"];
}

export function eventCard(e, reg) {
  const [label, tone] = availability(e, reg);
  const cover = e.image_url ? `<img src="${esc(e.image_url)}" alt="" loading="lazy">` : '<i class="bi bi-calendar-event"></i>';
  return `<div class="col-md-6 col-xl-4"><article class="event-card">
    <a class="event-cover" href="event-details.html?id=${e.id}" aria-label="${esc(e.title)}">${cover}<span class="badge text-bg-${tone}">${label}</span></a>
    <div class="event-body">
      <span class="cat-pill">${esc(e.categories?.name ?? "General")}</span>
      <h3><a href="event-details.html?id=${e.id}">${esc(e.title)}</a></h3>
      <div class="meta"><i class="bi bi-clock"></i>${fmtDate(e.start_date)} · ${fmtTime(e.start_date)} – ${fmtTime(e.end_date)}</div>
      <div class="meta"><i class="bi bi-geo-alt"></i>${esc(e.venue)}</div>
      <div class="meta"><i class="bi bi-people"></i>${Math.max(e.left, 0)} of ${e.capacity} seats left</div>
      <p class="small text-muted mb-0">${esc((e.description ?? "").slice(0, 100))}${(e.description ?? "").length > 100 ? "…" : ""}</p>
    </div></article></div>`;
}

export function eventRow(e, right = "") {
  const d = new Date(e.start_date);
  return `<div class="list-row"><div class="date-chip"><b>${d.getDate()}</b><span>${d.toLocaleString("en", { month: "short" })}</span></div>
    <div class="flex-grow-1"><a class="fw-semibold text-decoration-none" href="event-details.html?id=${e.id}">${esc(e.title)}</a>
    <div class="small text-muted">${fmtTime(e.start_date)} · ${esc(e.venue)}</div></div>${right}</div>`;
}
