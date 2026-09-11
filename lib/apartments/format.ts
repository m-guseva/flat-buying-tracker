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

export function formatViewingDate(viewingDate: string | null | undefined): string | null {
  if (!viewingDate) return null;
  // Plain string reformat, not a Date round-trip — viewingDate is stored as a
  // bare YYYY-MM-DD (matching <input type="date">'s own format), so this
  // avoids any UTC/local timezone shift a Date object would risk.
  const [year, month, day] = viewingDate.split('-');
  return `${day}.${month}.${year}`;
}

// Local date parts, not toISOString() — that's UTC and can shift the
// calendar day near midnight depending on timezone.
function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isUpcomingViewingDate(viewingDate: string, today: Date = new Date()): boolean {
  return viewingDate >= localDateString(today);
}

// Days since the UTC epoch for a YYYY-MM-DD string. Date.UTC is used purely
// as calendar-day arithmetic (no real timezone meaning) so the difference
// between two such numbers is an exact, DST-immune day count.
function toDayNumber(dateString: string): number {
  const [year, month, day] = dateString.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

const PAST_OFFSET = 1_000_000;

// A single ascending sort key that puts the soonest upcoming/today viewing
// first, then past viewings most-recent-first, then (via null, which the
// generic sorter already places last) apartments with no viewing date at
// all.
export function viewingDateSortRank(viewingDate: string | null | undefined, today: Date = new Date()): number | null {
  if (!viewingDate) return null;
  const diffDays = toDayNumber(viewingDate) - toDayNumber(localDateString(today));
  return diffDays >= 0 ? diffDays : PAST_OFFSET - diffDays;
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

export const STATUS_ORDER = Object.keys(STATUS_LABELS);

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
