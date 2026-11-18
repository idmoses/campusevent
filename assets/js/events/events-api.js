import { supabase } from "../config/supabase.js";

export async function fetchEvents() {
  const [ev, seats] = await Promise.all([
    supabase.from("events").select("*, categories(name)").eq("status", "published").order("start_date"),
    supabase.from("event_seats").select("event_id, taken"),
  ]);
  if (ev.error) throw ev.error;
  if (seats.error) throw new Error("Seat counts unavailable. Run database/patch_stage4.sql. " + seats.error.message);
  const taken = new Map(seats.data.map((s) => [s.event_id, Number(s.taken)]));
  return ev.data.map((e) => ({ ...e, taken: taken.get(e.id) ?? 0, left: e.capacity - (taken.get(e.id) ?? 0) }));
}

export async function fetchMine(uid) {
  const [regs, saved, att] = await Promise.all([
    supabase.from("registrations").select("event_id, status, registration_code, registered_at").eq("student_id", uid),
    supabase.from("saved_events").select("event_id").eq("student_id", uid),
    supabase.from("attendance").select("*", { count: "exact", head: true }).eq("student_id", uid).eq("status", "present"),
  ]);
  for (const r of [regs, saved, att]) if (r.error) throw r.error;
  return { regs: regs.data, saved: new Set(saved.data.map((s) => s.event_id)), attended: att.count ?? 0 };
}

export const register = (id) => supabase.rpc("register_for_event", { p_event_id: id });
export const cancel = (id) => supabase.rpc("cancel_registration", { p_event_id: id });
export async function toggleSave(uid, id, isSaved) {
  return isSaved
    ? supabase.from("saved_events").delete().eq("event_id", id).eq("student_id", uid)
    : supabase.from("saved_events").insert({ event_id: id, student_id: uid });
}
