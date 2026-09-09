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
  if (criteria.length === 0) return apartments;
  return [...apartments].sort((a, b) => {
    for (const criterion of criteria) {
      const result = compareBy(a, b, criterion);
      if (result !== 0) return result;
    }
    return 0;
  });
}
