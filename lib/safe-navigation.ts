export function safeInternalPath(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw || raw.length > 1000) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
  if (/^[\u0000-\u001f\u007f]/.test(raw) || /[\r\n\t]/.test(raw)) return null;
  try {
    const parsed = new URL(raw, "https://vivit.invalid");
    if (parsed.origin !== "https://vivit.invalid") return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
