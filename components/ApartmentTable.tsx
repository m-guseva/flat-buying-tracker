'use client';

import { useRouter } from 'next/navigation';
import type { Apartment } from '@prisma/client';
import { getField, TABLE_COLUMN_FIELDS } from '@/lib/apartments/fields';
import { formatPrice, STATUS_LABELS, MAKLERVERTRAG_LABELS } from '@/lib/apartments/format';

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

export function ApartmentTable({ apartments, columns }: { apartments: Apartment[]; columns: string[] }) {
  const router = useRouter();
  const orderedColumns = TABLE_COLUMN_FIELDS.filter((field) => columns.includes(field.key)).map((field) => field.key);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            {orderedColumns.map((key) => (
              <th key={key} className="p-2 font-medium">
                {getField(key)?.label ?? key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {apartments.map((apartment) => (
            <tr
              key={apartment.id}
              onClick={() => router.push(`/apartments/${apartment.id}`)}
              className="border-b hover:bg-gray-50 cursor-pointer"
            >
              {orderedColumns.map((key) => (
                <td key={key} className="p-2">
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
