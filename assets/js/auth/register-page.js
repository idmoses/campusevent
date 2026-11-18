import { signUp } from "./auth.js";
import { toast, setLoading, clean } from "../utils/ui.js";

const form = document.getElementById("registerForm");
const btn = document.getElementById("submitBtn");
const fields = ["full_name", "email", "student_id", "faculty", "department", "level", "phone"];

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const values = Object.fromEntries(fields.map((f) => [f, clean(form[f].value)]));
  const password = form.password.value;
  if (fields.some((f) => !values[f])) return toast("warning", "Fill in every field.");
  if (password.length < 8) return toast("warning", "Password must be at least 8 characters.");
  setLoading(btn, true);
  try {
    await signUp({ ...values, password });
    await Swal.fire("Check your email", "Open the verification link, then sign in.", "success");
    location.href = "login.html";
  } catch (err) {
    toast("error", err.message);
    setLoading(btn, false, "Create account");
  }
});
