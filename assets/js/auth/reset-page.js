import { supabase } from "../config/supabase.js";
import { loginUrl } from "./auth.js";
import { toast, setLoading } from "../utils/ui.js";
const form = document.getElementById("resetForm"), btn = document.getElementById("submitBtn");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (form.password.value.length < 8) return toast("warning", "Password must be at least 8 characters.");
  setLoading(btn, true);
  const { error } = await supabase.auth.updateUser({ password: form.password.value });
  if (error) { toast("error", error.message); return setLoading(btn, false, "Save password"); }
  await supabase.auth.signOut();
  await Swal.fire("Password updated", "Sign in with your new password.", "success");
  location.href = loginUrl;
});
