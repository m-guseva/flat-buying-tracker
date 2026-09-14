import type { Apartment } from '@prisma/client';
import { STATUS_LABELS } from './format';
import { getFieldValue } from './fields';

export type SortDirection = 'asc' | 'desc';

export interface SortCriterion {
  id: string;
  field: string;
  direction: SortDirection;
}

const STATUS_ORDER = Object.keys(STATUS_LABELS);
const CANCELED_STATUSES = new Set(['CANCELED_INTERNALLY', 'CANCELED_WITH_AGENT']);

function comparableValue(apartment: Apartment, field: string): number | null {
  if (field === 'status') {
    const index = STATUS_ORDER.indexOf(apartment.status);
    return index === -1 ? null : index;
  }
  if (field === 'createdAt') {
    return apartment.createdAt.getTime();
  }
  const raw = getFieldValue(apartment, field);
  return typeof raw === 'number' ? raw : null;
}

function compareBy(a: Apartment, b: Apartment, criterion: SortCriterion): number {
  const aValue = comparableValue(a, criterion.field);
  const bValue = comparableValue(b, criterion.field);

  if (aValue == null && bValue == null) return 0;
  if (aValue == null) return 1; // nulls always sort last, regardless of direction
  if (bValue == null) return -1;

  const diff = aValue - bValue;
  return criterion.direction === 'asc' ? diff : -diff;
}

export function sortApartments<T extends Apartment>(apartments: T[], criteria: SortCriterion[]): T[] {
  // Canceled apartments always sink to the bottom, as a bucket applied before
  // the user's own criteria — unless one of those criteria already sorts by
  // status itself, in which case that's an explicit, more specific choice
  // about where canceled statuses land (STATUS_ORDER already places them
  // last for an ascending sort) and this default shouldn't fight it.
  const bucketByCanceled = !criteria.some((criterion) => criterion.field === 'status');

  return [...apartments].sort((a, b) => {
    if (bucketByCanceled) {
      const aCanceled = CANCELED_STATUSES.has(a.status);
      const bCanceled = CANCELED_STATUSES.has(b.status);
      if (aCanceled !== bCanceled) return aCanceled ? 1 : -1;
    }
    for (const criterion of criteria) {
      const result = compareBy(a, b, criterion);
      if (result !== 0) return result;
    }
    return 0;
  });
}
