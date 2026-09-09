'use client';

import { useRouter } from 'next/navigation';
import type { Apartment } from '@prisma/client';
import { getField, TABLE_COLUMN_FIELDS } from '@/lib/apartments/fields';
import { formatPrice, STATUS_LABELS, MAKLERVERTRAG_LABELS } from '@/lib/apartments/format';
import type { SortCriterion } from '@/lib/apartments/sortApartments';

function formatCell(apartment: Apartment, key: string): string {
  const field = getField(key);
  if (!field) return '—';
  const value = (apartment as unknown as Record<string, unknown>)[key];
  if (value == null) return '—';

  if (key === 'price' || key === 'hausgeld') return formatPrice(value as number) ?? '—';
  if (key === 'livingArea') return `${value} m²`;
  if (key === 'status') return STATUS_LABELS[apartment.status] ?? String(value);
  if (key === 'maklervertragStatus') return MAKLERVERTRAG_LABELS[apartment.maklervertragStatus] ?? String(value);
  if (field.type === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function ApartmentTable({
  apartments,
  columns,
  sortCriteria,
  onSortChange,
}: {
  apartments: Apartment[];
  columns: string[];
  sortCriteria: SortCriterion[];
  onSortChange: (criteria: SortCriterion[]) => void;
}) {
  const router = useRouter();
  const orderedColumns = TABLE_COLUMN_FIELDS.filter((field) => columns.includes(field.key)).map((field) => field.key);
  const primarySort = sortCriteria[0];

  function handleHeaderClick(key: string) {
    const field = getField(key);
    if (!field?.sortable) return;
    if (primarySort?.field === key) {
      onSortChange([{ id: primarySort.id, field: key, direction: primarySort.direction === 'asc' ? 'desc' : 'asc' }]);
    } else {
      onSortChange([{ id: crypto.randomUUID(), field: key, direction: 'asc' }]);
    }
  }

  return (
    <div className="glass-panel overflow-x-auto p-1">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-white/70 bg-white/40 backdrop-blur-sm">
            {orderedColumns.map((key) => {
              const field = getField(key);
              const isSorted = primarySort?.field === key;
              return (
                <th
                  key={key}
                  onClick={() => handleHeaderClick(key)}
                  className={`py-2 px-3 font-medium first:rounded-tl-xl last:rounded-tr-xl ${
                    field?.sortable ? 'cursor-pointer select-none hover:text-indigo-700' : ''
                  } ${isSorted ? 'text-indigo-700' : 'text-gray-600'}`}
                >
                  {field?.label ?? key}
                  {isSorted && <span className="ml-1">{primarySort.direction === 'asc' ? '▲' : '▼'}</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {apartments.map((apartment) => (
            <tr
              key={apartment.id}
              onClick={() => router.push(`/apartments/${apartment.id}`)}
              className="border-b border-white/50 hover:bg-white/60 cursor-pointer transition-colors"
            >
              {orderedColumns.map((key) => (
                <td key={key} className="py-2 px-3">
                  {formatCell(apartment, key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
