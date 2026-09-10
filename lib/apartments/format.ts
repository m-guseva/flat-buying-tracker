export function formatPrice(price: number | null | undefined): string | null {
  if (price == null) return null;
  return `€${price.toLocaleString('de-DE')}`;
}

export function calculateMaklerFee(
  price: number | null | undefined,
  percent: number | null | undefined,
): number | null {
  if (price == null || percent == null) return null;
  return Math.round((price * percent) / 100);
}

export function formatAreaAndRooms(
  livingArea: number | null | undefined,
  rooms: number | null | undefined,
): string | null {
  const parts: string[] = [];
  if (livingArea != null) parts.push(`${livingArea} m²`);
  if (rooms != null) parts.push(`${rooms} rooms`);
  return parts.length ? parts.join(' · ') : null;
}

export const STATUS_LABELS: Record<string, string> = {
  NOT_CONTACTED: 'Not contacted yet',
  CONTACTED: 'Contacted',
  RECEIVED_EXPOSE: 'Received Exposé',
  SETUP_VIEWING: 'Setup viewing',
  POST_VIEWING: 'Post-viewing stage',
  INTEREST_FOR_PURCHASE: 'Interest for purchase',
};

export const MAKLERVERTRAG_LABELS: Record<string, string> = {
  NOT_RECEIVED: 'Not received',
  RECEIVED: 'Received',
  SIGNED: 'Signed',
  WIDERRUF: 'Widerruf',
};

export const SOURCE_LABELS: Record<string, string> = {
  IMMOSCOUT24: 'ImmoScout24',
  IMMOWELT: 'Immowelt',
  MANUAL: 'Manual entry',
  OTHER: 'Other',
};
