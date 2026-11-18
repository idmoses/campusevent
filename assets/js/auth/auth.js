import { supabase } from "../config/supabase.js";

// Project root resolved from this file, so paths work from any page or subfolder.
const ROOT = new URL("../../../", import.meta.url).href;
const HOME = { student: `${ROOT}student/dashboard.html`, organizer: `${ROOT}admin/dashboard.html`, admin: `${ROOT}admin/dashboard.html` };
const LOGIN = `${ROOT}login.html`;

export async function signUp({ email, password, ...meta }) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: meta, emailRedirectTo: LOGIN },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const profile = await getProfile();
  if (!profile?.is_active) { await signOut(false); throw new Error("This account is deactivated."); }
  return profile;
}

export async function signOut(redirect = true) {
  await supabase.auth.signOut();
  if (redirect) location.href = LOGIN;
}

export const sendPasswordReset = (email) =>
  supabase.auth.resetPasswordForEmail(email, { redirectTo: `${ROOT}reset-password.html` });

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error) throw error;
  return data;
}

// Role comes from the profiles table (protected by RLS + trigger), never from local state.
function showFatal(message) {
  document.body.innerHTML = `<div class="container py-5" style="max-width:640px"><div class="alert alert-danger"><h5 class="alert-heading">We could not load your account</h5><p class="mb-0">${message}</p></div><button class="btn btn-outline-secondary" id="fatalOut">Sign out</button></div>`;
  document.getElementById("fatalOut").addEventListener("click", () => signOut());
}

export async function requireAuth(allowed = ["student", "organizer", "admin"]) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { location.replace(LOGIN); return null; }
  let profile;
  try { profile = await getProfile(); }
  catch (e) {
    showFatal("Your profile record is missing or unreadable. Run database/patch_stage4.sql in the Supabase SQL Editor, then reload. (" + e.message + ")");
    return null;
  }
  if (!profile.is_active) { await signOut(); return null; }
  if (!allowed.includes(profile.role)) { location.replace(HOME[profile.role]); return null; }
  return profile;
}

export const homeFor = (role) => HOME[role] ?? HOME.student;

export const loginUrl = LOGIN;
