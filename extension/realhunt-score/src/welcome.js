// First screen after install: one step to a free account (consent + email + 6-digit code). Skipping is fine.
const T = (k, s) => chrome.i18n.getMessage(k, s) || k;
const $ = (id) => document.getElementById(id);
const send = (m) => new Promise((r) => chrome.runtime.sendMessage(m, (x) => r(chrome.runtime.lastError ? null : x)));
for (const [id, k] of [["t", "welcome_title"], ["b", "welcome_body"], ["fb", "free_badge"], ["st", "signup_title"], ["sb", "signup_body"], ["mkl", "marketing_ok"], ["go", "signup_cta"], ["skip", "not_now"], ["ck", "code_cta"], ["cb", "unlock_fine"], ["pv", "privacy"], ["try", "try_it"]]) $(id).textContent = T(k);
let mk = false;
$("go").onclick = async () => {
  const email = $("em").value.trim(); mk = $("mk").checked;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { $("msg").textContent = T("bad_email"); return; }
  $("go").disabled = true; await send({ t: "consent" });
  const r = await send({ t: "verifyStart", email, lang: (self.RHS && RHS.lang) || "en" });
  $("go").disabled = false;
  if (r && r.ok) { $("s1").style.display = "none"; $("s2").style.display = ""; $("cs").textContent = T("code_sent", [email]); $("msg").textContent = ""; $("cd").focus(); }
  else $("msg").textContent = r && r.error === "wait" ? T("wait_code") : T("try_again");
};
$("ck").onclick = async () => {
  const r = await send({ t: "verifyCheck", code: $("cd").value.replace(/\D/g, ""), marketing: mk });
  if (r && r.ok) { $("form").style.display = "none"; $("done").style.display = ""; $("done").querySelector("h2").textContent = "✓ " + r.email; send({ t: "track", kind: "lead" }); }
  else $("msg").textContent = r && r.error === "expired" ? T("code_expired") : T("code_wrong");
};
$("cd").addEventListener("keydown", (e) => { if (e.key === "Enter") $("ck").click(); });
$("em").addEventListener("keydown", (e) => { if (e.key === "Enter") $("go").click(); });
$("skip").onclick = () => window.close();
