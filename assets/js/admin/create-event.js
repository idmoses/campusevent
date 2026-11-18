import { mountShell, esc } from "../utils/layout.js";
import { supabase } from "../config/supabase.js";
import { toast, setLoading, clean } from "../utils/ui.js";

const shell = await mountShell({ area: "admin", title: "Event" });
const editId = new URLSearchParams(location.search).get("id");
const local = (iso) => { if (!iso) return ""; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

if (shell) {
  const { profile, main } = shell;
  const [cats, existing] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    editId ? supabase.from("events").select("*").eq("id", editId).single() : Promise.resolve({ data: null }),
  ]);
  const e = existing.data ?? { status: "draft", capacity: 50 };
  document.querySelector(".topbar h1").textContent = editId ? "Edit Event" : "Create Event";
  main.innerHTML = `<form id="evForm" class="card-soft p-4" style="max-width:860px" novalidate><div class="row g-3">
    <div class="col-12"><label class="form-label" for="title">Title</label><input class="form-control" id="title" value="${esc(e.title)}" required></div>
    <div class="col-md-6"><label class="form-label" for="category_id">Category</label><select class="form-select" id="category_id">${(cats.data ?? []).map((c) => `<option value="${c.id}" ${c.id === e.category_id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
    <div class="col-md-6"><label class="form-label" for="venue">Venue</label><input class="form-control" id="venue" value="${esc(e.venue)}" required></div>
    <div class="col-12"><label class="form-label" for="description">Description</label><textarea class="form-control" id="description" rows="5">${esc(e.description)}</textarea></div>
    <div class="col-md-4"><label class="form-label" for="start_date">Starts</label><input class="form-control" id="start_date" type="datetime-local" value="${local(e.start_date)}" required></div>
    <div class="col-md-4"><label class="form-label" for="end_date">Ends</label><input class="form-control" id="end_date" type="datetime-local" value="${local(e.end_date)}" required></div>
    <div class="col-md-4"><label class="form-label" for="registration_deadline">Registration deadline</label><input class="form-control" id="registration_deadline" type="datetime-local" value="${local(e.registration_deadline)}"></div>
    <div class="col-md-4"><label class="form-label" for="capacity">Capacity</label><input class="form-control" id="capacity" type="number" min="1" value="${e.capacity}" required></div>
    <div class="col-md-4"><label class="form-label" for="status">Status</label><select class="form-select" id="status">${["draft", "published", "archived", "cancelled"].map((s) => `<option ${s === e.status ? "selected" : ""}>${s}</option>`).join("")}</select></div>
    <div class="col-md-4"><label class="form-label" for="image">Cover image (max 2 MB)</label><input class="form-control" id="image" type="file" accept="image/jpeg,image/png,image/webp"></div>
    ${e.image_url ? `<div class="col-12"><img src="${esc(e.image_url)}" alt="" style="height:90px;border-radius:.6rem"></div>` : ""}
    <div class="col-12 d-flex gap-2"><button class="btn btn-primary" id="saveBtn" type="submit">${editId ? "Save changes" : "Create event"}</button><a class="btn btn-light" href="events.html">Cancel</a></div></div></form>`;
  const form = document.getElementById("evForm"), btn = document.getElementById("saveBtn"), label = btn.textContent;
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const v = { title: clean(form.title.value), venue: clean(form.venue.value), description: clean(form.description.value), category_id: form.category_id.value || null,
      capacity: parseInt(form.capacity.value, 10), status: form.status.value };
    const start = new Date(form.start_date.value), end = new Date(form.end_date.value);
    const deadline = form.registration_deadline.value ? new Date(form.registration_deadline.value) : null;
    if (!v.title || !v.venue || isNaN(start) || isNaN(end)) return toast("warning", "Title, venue, start and end are required.");
    if (end <= start) return toast("warning", "End must be after start.");
    if (deadline && deadline > start) return toast("warning", "Deadline must be before the event starts.");
    if (!(v.capacity > 0)) return toast("warning", "Capacity must be at least 1.");
    Object.assign(v, { start_date: start.toISOString(), end_date: end.toISOString(), registration_deadline: deadline?.toISOString() ?? null });
    setLoading(btn, true);
    try {
      const file = form.image.files[0];
      if (file) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error("Image must be JPG, PNG or WebP under 2 MB.");
        const path = `${profile.id}/${Date.now()}.${file.type.split("/")[1]}`;
        const up = await supabase.storage.from("event-images").upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;
        v.image_url = supabase.storage.from("event-images").getPublicUrl(path).data.publicUrl;
      }
      const { error } = editId ? await supabase.from("events").update(v).eq("id", editId) : await supabase.from("events").insert({ ...v, organizer_id: profile.id });
      if (error) throw error;
      await Swal.fire("Saved", "The event has been saved.", "success");
      location.href = "events.html";
    } catch (err) { toast("error", err.message); setLoading(btn, false, label); }
  });
}
