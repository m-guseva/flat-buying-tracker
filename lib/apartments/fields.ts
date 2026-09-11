import type { Apartment } from '@prisma/client';
import { STATUS_LABELS, MAKLERVERTRAG_LABELS, calculateMaklerFee } from './format';

export type FieldType = 'text' | 'number' | 'boolean' | 'select';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  filterable: boolean;
  sortable: boolean;
  tableColumn: boolean;
  defaultColumn: boolean;
  options?: FieldOption[];
  computed?: (apartment: Apartment) => unknown;
}

function toOptions(labels: Record<string, string>): FieldOption[] {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

// The official German energy-efficiency scale (EnEV/GEG), worst to best is
// H..A+ — listed here best-first to match how it's shown everywhere else.
export const ENERGIEAUSWEIS_GRADES = ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export const FIELDS: FieldDef[] = [
  { key: 'address', label: 'Address', type: 'text', filterable: true, sortable: false, tableColumn: true, defaultColumn: true },
  { key: 'price', label: 'Price', type: 'number', filterable: true, sortable: true, tableColumn: true, defaultColumn: true },
  { key: 'livingArea', label: 'Living area', type: 'number', filterable: true, sortable: true, tableColumn: true, defaultColumn: true },
  { key: 'rooms', label: 'Rooms', type: 'number', filterable: true, sortable: true, tableColumn: true, defaultColumn: true },
  { key: 'floor', label: 'Floor', type: 'text', filterable: true, sortable: false, tableColumn: true, defaultColumn: false },
  { key: 'balcony', label: 'Balcony', type: 'boolean', filterable: true, sortable: false, tableColumn: true, defaultColumn: false },
  { key: 'elevator', label: 'Elevator', type: 'boolean', filterable: true, sortable: false, tableColumn: true, defaultColumn: false },
  { key: 'kitchen', label: 'Kitchen', type: 'boolean', filterable: true, sortable: false, tableColumn: true, defaultColumn: false },
  { key: 'condition', label: 'Condition', type: 'text', filterable: true, sortable: false, tableColumn: true, defaultColumn: false },
  {
    key: 'energieausweis',
    label: 'Energieausweis',
    type: 'select',
    filterable: true,
    sortable: false,
    tableColumn: true,
    defaultColumn: false,
    options: ENERGIEAUSWEIS_GRADES.map((grade) => ({ value: grade, label: grade })),
  },
  { key: 'hausgeld', label: 'Hausgeld', type: 'number', filterable: true, sortable: true, tableColumn: true, defaultColumn: true },
  { key: 'locationRating', label: 'Location rating', type: 'number', filterable: true, sortable: true, tableColumn: true, defaultColumn: false },
  { key: 'personalRating', label: 'Personal rating', type: 'number', filterable: true, sortable: true, tableColumn: true, defaultColumn: false },
  { key: 'status', label: 'Status', type: 'select', filterable: true, sortable: true, tableColumn: true, defaultColumn: true, options: toOptions(STATUS_LABELS) },
  { key: 'maklervertragStatus', label: 'Maklervertrag', type: 'select', filterable: true, sortable: false, tableColumn: true, defaultColumn: true, options: toOptions(MAKLERVERTRAG_LABELS) },
  {
    key: 'maklerFee',
    label: 'Makler fee',
    type: 'number',
    filterable: true,
    sortable: true,
    tableColumn: true,
    defaultColumn: true,
    computed: (apartment) => calculateMaklerFee(apartment.price, apartment.maklerprovisionPercent),
  },
  { key: 'createdAt', label: 'Date added', type: 'number', filterable: false, sortable: true, tableColumn: false, defaultColumn: false },
];

export function getField(key: string): FieldDef | undefined {
  return FIELDS.find((field) => field.key === key);
}

export function getFieldValue(apartment: Apartment, key: string): unknown {
  const field = getField(key);
  if (field?.computed) return field.computed(apartment);
  return (apartment as unknown as Record<string, unknown>)[key];
}

export const FILTERABLE_FIELDS = FIELDS.filter((field) => field.filterable);
export const SORTABLE_FIELDS = FIELDS.filter((field) => field.sortable);
export const TABLE_COLUMN_FIELDS = FIELDS.filter((field) => field.tableColumn);
export const DEFAULT_TABLE_COLUMNS = TABLE_COLUMN_FIELDS.filter((field) => field.defaultColumn).map((field) => field.key);
