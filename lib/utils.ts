export const CURRENCIES = {
  USD: { symbol: "$",   name: "US Dollar",        rate: 1 },
  EGP: { symbol: "ج.م",  name: "Egyptian Pound",   rate: 48.5 },
  AED: { symbol: "د.إ", name: "UAE Dirham",         rate: 3.67 },
  SAR: { symbol: "ر.س", name: "Saudi Riyal",        rate: 3.75 },
  GBP: { symbol: "£",   name: "British Pound",      rate: 0.79 },
  EUR: { symbol: "€",   name: "Euro",               rate: 0.92 },
};

export type CurrencyCode = keyof typeof CURRENCIES;

export function formatCurrency(
  amount: number,
  currency: CurrencyCode = "EGP",
  convert = false
): string {
  const c = CURRENCIES[currency] ?? CURRENCIES.EGP;
  const val = convert ? amount * c.rate : amount;
  if (currency === "EGP") {
    return `${new Intl.NumberFormat("en-EG", { maximumFractionDigits: 0 }).format(val)} ${c.symbol}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(val);
}

export function convertCurrency(
  amount: number,
  from: CurrencyCode = "USD",
  to: CurrencyCode = "USD"
): number {
  const fromRate = CURRENCIES[from]?.rate ?? 1;
  const toRate   = CURRENCIES[to]?.rate ?? 1;
  return (amount / fromRate) * toRate;
}

export function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

// ── Business Utilities ────────────────────────────────────────
export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

export function daysBetween(a: Date, b: Date = new Date()): number {
  return Math.ceil((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
}

export function classifyROAS(roas: number): { label: string; color: string } {
  if (roas >= 3)   return { label: "Excellent", color: "#10b981" };
  if (roas >= 2)   return { label: "Good",      color: "#0077B6" };
  if (roas >= 1)   return { label: "Break-even",color: "#f59e0b" };
  return              { label: "Loss",       color: "#ef4444" };
}

export function classifyHealth(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Healthy",  color: "#10b981" };
  if (score >= 60) return { label: "At Risk",  color: "#f59e0b" };
  return              { label: "Critical", color: "#ef4444" };
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function truncate(text: string, length = 50): string {
  return text.length > length ? text.slice(0, length) + "…" : text;
}

export const MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;
export const MONTH_FULL = ["","January","February","March","April","May","June","July","August","September","October","November","December"] as const;

// ── Multi-Currency (Feature 17) ───────────────────────────────
export const CURRENCY_RATES: Record<string,number> = {
  USD: 1, EGP: 30.9, AED: 3.67, SAR: 3.75, GBP: 0.79, EUR: 0.92,
};
export const CURRENCY_SYMBOLS: Record<string,string> = {
  USD: "$", EGP: "ج.م", AED: "د.إ", SAR: "﷼", GBP: "£", EUR: "€",
};
export function formatCurrencyLocale(amount: number, currency = "EGP"): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? "ج.م";
  const val = amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return currency === "EGP" || currency === "AED" || currency === "SAR" ? `${val} ${sym}` : `${sym}${val}`;
}

// ── RTL Helper (Feature 14) ───────────────────────────────────
export function isRTL(locale = "en"): boolean {
  return ["ar","he","fa","ur"].includes(locale);
}

// ── Timezone Support (Improvement 19) ────────────────────────
export const TIMEZONES: Record<string, string> = {
  "Africa/Cairo":     "Cairo (EET, UTC+2)",
  "Asia/Dubai":       "Dubai (GST, UTC+4)",
  "Asia/Riyadh":      "Riyadh (AST, UTC+3)",
  "Europe/London":    "London (GMT/BST)",
  "America/New_York": "New York (EST/EDT)",
  "America/Los_Angeles":"Los Angeles (PST/PDT)",
  "UTC":              "UTC",
};

export function formatDateTZ(date: Date | string, timezone = "Africa/Cairo"): string {
  return new Date(date).toLocaleString("en-US", {
    timeZone: timezone,
    year:"numeric", month:"short", day:"numeric",
    hour:"2-digit", minute:"2-digit",
  });
}

export function formatDateOnlyTZ(date: Date | string, timezone = "Africa/Cairo"): string {
  return new Date(date).toLocaleDateString("en-US", {
    timeZone: timezone,
    year:"numeric", month:"short", day:"numeric",
  });
}

export function nowInTZ(timezone = "Africa/Cairo"): string {
  return formatDateTZ(new Date(), timezone);
}

// ── Error Message Localization (Feature 13) ──────────────────
type Lang = "ar" | "en";

const ERROR_MSGS: Record<string, Record<Lang, string>> = {
  "UNAUTHORIZED":          { ar:"غير مصرح — يرجى تسجيل الدخول", en:"Unauthorized — please log in" },
  "NOT_FOUND":             { ar:"العنصر غير موجود", en:"Record not found" },
  "VALIDATION_ERROR":      { ar:"يرجى التحقق من البيانات المدخلة", en:"Please check your input" },
  "DB_ERROR":              { ar:"خطأ في قاعدة البيانات — حاول مرة أخرى", en:"Database error — please try again" },
  "RATE_LIMIT":            { ar:"تم تجاوز الحد المسموح — انتظر دقيقة", en:"Rate limit exceeded — wait 1 minute" },
  "NETWORK_ERROR":         { ar:"خطأ في الاتصال — تحقق من الإنترنت", en:"Connection error — check your internet" },
  "DUPLICATE":             { ar:"هذا السجل موجود بالفعل", en:"This record already exists" },
  "PERMISSION_DENIED":     { ar:"ليس لديك صلاحية للقيام بهذا الإجراء", en:"You don't have permission for this action" },
  "FILE_TOO_LARGE":        { ar:"حجم الملف كبير جداً — تحقق من الحد الأقصى المسموح", en:"File too large — check the maximum allowed size" },
  "INVALID_DATE":          { ar:"التاريخ غير صحيح", en:"Invalid date" },
  "SESSION_EXPIRED":       { ar:"انتهت جلسة العمل — يرجى تسجيل الدخول مرة أخرى", en:"Session expired — please log in again" },
  "BUDGET_EXCEEDED":       { ar:"تم تجاوز الميزانية المحددة", en:"Budget limit exceeded" },
  "CONFLICT":              { ar:"تم تعديل هذا السجل من قِبل شخص آخر — حدّث الصفحة", en:"Record was modified by someone else — please refresh" },
};

export function getErrorMsg(code: string, lang: Lang = "en"): string {
  return ERROR_MSGS[code]?.[lang] ?? ERROR_MSGS[code]?.en ?? "An unexpected error occurred";
}

export function detectLang(locale?: string): Lang {
  if (!locale) return "en";
  return locale.startsWith("ar") ? "ar" : "en";
}
