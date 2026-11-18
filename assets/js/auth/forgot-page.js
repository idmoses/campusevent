import { sendPasswordReset } from "./auth.js";
import { toast, setLoading, clean } from "../utils/ui.js";
const form = document.getElementById("forgotForm"), btn = document.getElementById("submitBtn");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = clean(form.email.value);
  if (!email) return toast("warning", "Enter your email address.");
  setLoading(btn, true);
  const { error } = await sendPasswordReset(email);
  setLoading(btn, false, "Send reset link");
  error ? toast("error", error.message) : Swal.fire("Check your email", "If an account exists, a reset link is on its way.", "success");
});
