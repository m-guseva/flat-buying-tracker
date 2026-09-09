const GUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:-\d+)?/i;

export function extractGalleryImages(html: string, imgSrcs: string[], cdnHost: string): string[] {
  const escapedHost = cdnHost.replace(/\./g, '\\.');
  const urls: string[] = [];

  for (const src of imgSrcs) {
    if (/^https?:\/\//.test(src)) {
      try {
        if (new URL(src).hostname === cdnHost) {
          urls.push(src);
        }
      } catch {
        // unparseable "absolute-looking" string — skip it rather than throwing
      }
      continue;
    }

    const guidMatch = src.match(GUID_PATTERN);
    if (!guidMatch) continue;
    const guid = guidMatch[0];

    const urlPattern = new RegExp(`https://${escapedHost}/[^"'\\\\]*${guid}[^"'\\\\]*`, 'g');
    const matches = html.match(urlPattern);
    if (!matches || matches.length === 0) continue;

    const largeVariant = matches.find((match) => /1106x830/.test(match));
    urls.push(largeVariant ?? matches[0]);
  }

  return Array.from(new Set(urls));
}
