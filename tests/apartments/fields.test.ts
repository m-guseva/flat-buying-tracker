import { describe, it, expect } from 'vitest';
import {
  FIELDS,
  getField,
  FILTERABLE_FIELDS,
  SORTABLE_FIELDS,
  TABLE_COLUMN_FIELDS,
  DEFAULT_TABLE_COLUMNS,
} from '@/lib/apartments/fields';

describe('fields catalog', () => {
  it('gives every field a unique key', () => {
    const keys = FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('builds status options from STATUS_LABELS in pipeline order', () => {
    const status = getField('status');
    expect(status?.options?.map((o) => o.value)).toEqual([
      'NOT_CONTACTED',
      'CONTACTED',
      'RECEIVED_EXPOSE',
      'SETUP_VIEWING',
      'POST_VIEWING',
      'INTEREST_FOR_PURCHASE',
    ]);
    expect(status?.options?.find((o) => o.value === 'CONTACTED')?.label).toBe('Contacted');
  });

  it('builds maklervertragStatus options from MAKLERVERTRAG_LABELS', () => {
    const mv = getField('maklervertragStatus');
    expect(mv?.options?.map((o) => o.value)).toEqual(['NOT_RECEIVED', 'RECEIVED', 'SIGNED', 'WIDERRUF']);
  });

  it('marks createdAt sortable but not filterable or a table column', () => {
    const createdAt = getField('createdAt');
    expect(createdAt?.sortable).toBe(true);
    expect(createdAt?.filterable).toBe(false);
    expect(createdAt?.tableColumn).toBe(false);
  });

  it('defaults the table columns to address, price, livingArea, rooms, hausgeld, status, maklervertragStatus', () => {
    expect(DEFAULT_TABLE_COLUMNS).toEqual([
      'address',
      'price',
      'livingArea',
      'rooms',
      'hausgeld',
      'status',
      'maklervertragStatus',
    ]);
  });

  it('filters the catalog into filterable/sortable/table-column subsets', () => {
    expect(FILTERABLE_FIELDS.length).toBeGreaterThan(0);
    expect(FILTERABLE_FIELDS.every((f) => f.filterable)).toBe(true);
    expect(SORTABLE_FIELDS.every((f) => f.sortable)).toBe(true);
    expect(TABLE_COLUMN_FIELDS.every((f) => f.tableColumn)).toBe(true);
  });
});
