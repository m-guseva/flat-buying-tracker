import type { Apartment } from '@prisma/client';
import { getField, getFieldValue } from './fields';

export type FilterOperator = 'eq' | 'lt' | 'lte' | 'gt' | 'gte' | 'contains';

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string;
}

export function matchesFilter(apartment: Apartment, condition: FilterCondition): boolean {
  const field = getField(condition.field);
  if (!field) return true;
  const rawValue = getFieldValue(apartment, condition.field);

  if (field.type === 'text') {
    return typeof rawValue === 'string' && rawValue.toLowerCase().includes(condition.value.toLowerCase());
  }

  if (field.type === 'number') {
    if (typeof rawValue !== 'number') return false;
    const target = Number(condition.value);
    if (!Number.isFinite(target)) return false;
    switch (condition.operator) {
      case 'eq':
        return rawValue === target;
      case 'lt':
        return rawValue < target;
      case 'lte':
        return rawValue <= target;
      case 'gt':
        return rawValue > target;
      case 'gte':
        return rawValue >= target;
      default:
        return false;
    }
  }

  if (field.type === 'boolean') {
    return typeof rawValue === 'boolean' && rawValue === (condition.value === 'true');
  }

  // select
  return typeof rawValue === 'string' && rawValue === condition.value;
}

export function matchesAllFilters(apartment: Apartment, conditions: FilterCondition[]): boolean {
  return conditions.every((condition) => matchesFilter(apartment, condition));
}
