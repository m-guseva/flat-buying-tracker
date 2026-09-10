import { parseGermanNumber } from './parseGermanNumber';

export function parseProvisionPercent(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const match = text.match(/^([\d,.]+)\s*%/);
  if (!match) return undefined;
  return parseGermanNumber(match[1]);
}
