import { requireAuth, signOut } from "../auth/auth.js";

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const fmtDate = (d) => new Date(d).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
export const fmtTime = (d) => new Date(d).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
export const skeletons = (n = 3, h = 230) => Array.from({ length: n }, () => `<div class="col-md-6 col-xl-4"><div class="skeleton" style="height:${h}px"></div></div>`).join("");
export const emptyState = (icon, title, text, cta = "") => `<div class="empty-state"><i class="bi ${icon}"></i><h3>${esc(title)}</h3><p>${esc(text)}</p>${cta}</div>`;
export const errorState = (msg) => emptyState("bi-exclamation-triangle", "Something went wrong", msg);

// [file, icon, label, comingSoon]
const NAV = {
  student: [
    ["dashboard.html", "bi-grid-1x2", "Dashboard"],
    ["events.html", "bi-compass", "Explore Events"],
    ["my-events.html", "bi-ticket-perforated", "My Events"],
    ["saved-events.html", "bi-bookmark", "Saved Events"],
    ["profile.html", "bi-person", "Profile"],
  ],
  admin: [
    ["dashboard.html", "bi-speedometer2", "Overview"],
    ["events.html", "bi-calendar2-event", "Manage Events"],
    ["create-event.html", "bi-plus-circle", "Create Event"],
    ["registrations.html", "bi-people", "Registrations"],
    ["attendance.html", "bi-qr-code-scan", "Attendance"],
    ["students.html", "bi-mortarboard", "Students"],
    ["analytics.html", "bi-bar-chart-line", "Analytics"],
  ],
};

export async function mountShell({ area, title }) {
  const profile = await requireAuth(area === "admin" ? ["admin", "organizer"] : undefined);
  if (!profile) return null;
  const here = location.pathname.split("/").pop() || "dashboard.html";
  const links = NAV[area].map(([file, icon, label, soon]) =>
    `<a class="side-link ${file === here ? "active" : ""} ${soon ? "disabled" : ""}" href="${file}"><i class="bi ${icon}"></i>${label}${soon ? '<span class="badge">Soon</span>' : ""}</a>`).join("");
  const initials = profile.full_name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "U";
  document.getElementById("app").innerHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="brand"><i class="bi bi-calendar2-event"></i>CampusConnect</div>
      <nav>${links}</nav>
      <div class="side-foot">${area === "admin" ? "Staff console" : "Student portal"}</div>
    </aside><div class="scrim" id="scrim"></div>
    <div class="content-area">
      <header class="topbar">
        <button class="btn btn-light d-lg-none" id="menuBtn" aria-label="Menu"><i class="bi bi-list"></i></button>
        <h1>${esc(title)}</h1>
        <div class="ms-auto d-flex align-items-center gap-3">
          <div class="text-end d-none d-sm-block"><div class="fw-semibold small">${esc(profile.full_name)}</div><div class="small text-muted text-capitalize">${esc(profile.role)}</div></div>
          <div class="avatar">${esc(initials)}</div>
          <button class="btn btn-outline-secondary btn-sm" id="logoutBtn"><i class="bi bi-box-arrow-right me-1"></i>Log out</button>
        </div>
      </header>
      <main class="page" id="main"></main>
    </div>`;
  const side = document.getElementById("sidebar"), scrim = document.getElementById("scrim");
  const toggle = () => { side.classList.toggle("open"); scrim.classList.toggle("show"); };
  document.getElementById("menuBtn").addEventListener("click", toggle);
  scrim.addEventListener("click", toggle);
  document.getElementById("logoutBtn").addEventListener("click", () => signOut());
  return { profile, main: document.getElementById("main") };
}
