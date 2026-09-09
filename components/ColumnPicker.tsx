'use client';

import { TABLE_COLUMN_FIELDS } from '@/lib/apartments/fields';

export function ColumnPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  function toggle(key: string) {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  }

  return (
    <div className="border rounded p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
      {TABLE_COLUMN_FIELDS.map((field) => (
        <label key={field.key} className="flex items-center gap-2">
          <input type="checkbox" checked={selected.includes(field.key)} onChange={() => toggle(field.key)} />
          {field.label}
        </label>
      ))}
    </div>
  );
}
