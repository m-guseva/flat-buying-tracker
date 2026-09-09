export function parseGermanNumber(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const cleaned = text
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3})/g, '')
    .replace(',', '.');
  if (!cleaned) return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}
