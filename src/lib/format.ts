export function fmtIQD(n: number | string | null | undefined, lang: "ar" | "en" = "ar"): string {
  const num = Number(n ?? 0);
  if (!Number.isFinite(num)) return lang === "ar" ? "0 د.ع" : "0 IQD";
  const formatted = num.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return lang === "ar" ? `${formatted} د.ع` : `${formatted} IQD`;
}

export function fmtNum(n: number | string | null | undefined): string {
  const num = Number(n ?? 0);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
