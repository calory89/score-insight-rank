// Only local destinations are allowed, including when a confirmation link is opened on another device.
export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || [...value].some(char => char.charCodeAt(0) <= 32)) return "/";
  try {
    const url = new URL(value, "https://realhunt.co");
    if (url.origin !== "https://realhunt.co" || url.pathname.startsWith("/auth/")) return "/";
    return url.pathname + url.search + url.hash;
  } catch { return "/"; }
}
export function rememberReturn(to: string) {
  const value = safeReturnPath(to);
  try { sessionStorage.setItem("rh_redirect", value); localStorage.setItem("rh_redirect", value); } catch { /* The email link also carries the destination. */ }
  return value;
}
export function readReturn(search = location.search) {
  const explicit = new URLSearchParams(search).get("next");
  if (explicit !== null) return safeReturnPath(explicit);
  try { return safeReturnPath(sessionStorage.getItem("rh_redirect") || localStorage.getItem("rh_redirect")); } catch { return "/"; }
}
export function clearReturn() {
  try { sessionStorage.removeItem("rh_redirect"); localStorage.removeItem("rh_redirect"); } catch { /* Storage can be unavailable in private browsing. */ }
}
export const confirmationUrl = (origin: string, to: string) => `${origin}/auth/callback?next=${encodeURIComponent(safeReturnPath(to))}`;
export function authError(error: { message?: string; status?: number; code?: string } | null | undefined, signingIn = false) {
  if (error?.status === 429 || /rate|too many|security purposes/i.test(error?.message || "")) return "Please wait a minute before requesting another link. Check your inbox and spam folder for the latest email.";
  if (error?.code === "email_not_confirmed") return "Your email is not confirmed yet. Choose ‘Email me a sign-in link’ below to request a new link.";
  if (signingIn && /credentials|password/i.test(error?.message || "")) return "The email or password does not match. Try again or use an email sign-in link below.";
  return "We could not complete that request. Check your connection and try again. Your home is still saved here.";
}
