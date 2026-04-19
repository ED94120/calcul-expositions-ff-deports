export function normalizeNumericText(text) {
  return String(text ?? "").trim().replace(/\s+/g, "").replace(",", ".");
}

export function isValidNumberText(text) {
  const normalized = normalizeNumericText(text);
  if (normalized === "") return false;
  return /^[+-]?\d+(\.\d+)?$/.test(normalized);
}

export function parseLocalizedNumber(text) {
  const normalized = normalizeNumericText(text);
  if (normalized === "") return null;

  const value = Number(normalized);
  return Number.isFinite(value) ? value : NaN;
}

export function formatNumberForDisplay(value, decimals = 2) {
  if (value == null || !Number.isFinite(value)) return "";
  return Number(value).toFixed(decimals).replace(".", ",");
}

export function formatNumberForCopy(value, decimals = 2) {
  return formatNumberForDisplay(value, decimals);
}

export function dbwToW(dbw) {
  return 10 ** (dbw / 10);
}

export function dbToLinear(db) {
  return 10 ** (db / 10);
}

export async function copyTextToClipboard(text) {
  await navigator.clipboard.writeText(text);
}
