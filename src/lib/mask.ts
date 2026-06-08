// Lightweight client-side masking helpers for displaying PII safely in the UI.
export function maskEmail(e?: string) {
  if (!e) return "";
  const [u, d] = e.split("@");
  if (!d) return "•••";
  const head = u.slice(0, 2);
  return `${head}${"•".repeat(Math.max(2, u.length - 2))}@${d}`;
}
export function maskPhone(p?: string) {
  if (!p) return "";
  return p.replace(/\d(?=\d{2})/g, "•");
}
export function maskCard(c?: string) {
  if (!c) return "";
  const digits = c.replace(/\D/g, "");
  return `•••• •••• •••• ${digits.slice(-4)}`;
}
export function maskAddress(a?: string) {
  if (!a) return "";
  return a.replace(/\d+/g, "••").replace(/\b[A-Z][a-z]+\b/g, (w) => w[0] + "•••");
}
export function maskApiKey(k?: string) {
  if (!k) return "";
  return `${k.slice(0, 4)}••••••••••••${k.slice(-4)}`;
}
