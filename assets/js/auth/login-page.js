import { signIn, homeFor } from "./auth.js";
import { toast, setLoading, clean } from "../utils/ui.js";

const form = document.getElementById("loginForm");
const btn = document.getElementById("submitBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = clean(form.email.value), password = form.password.value;
  if (!email || !password) return toast("warning", "Enter your email and password.");
  setLoading(btn, true);
  try {
    const profile = await signIn(email, password);
    location.href = homeFor(profile.role);
  } catch (err) {
    toast("error", err.message);
    setLoading(btn, false, "Sign in");
  }
});
