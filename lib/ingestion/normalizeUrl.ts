export function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.search = '';
  parsed.hash = '';
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }
  return parsed.toString();
}
