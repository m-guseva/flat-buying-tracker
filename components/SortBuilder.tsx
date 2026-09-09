'use client';

import { SORTABLE_FIELDS } from '@/lib/apartments/fields';
import type { SortCriterion, SortDirection } from '@/lib/apartments/sortApartments';

function newCriterion(): SortCriterion {
  return { id: crypto.randomUUID(), field: SORTABLE_FIELDS[0].key, direction: 'asc' };
}

export function SortBuilder({
  criteria,
  onChange,
}: {
  criteria: SortCriterion[];
  onChange: (criteria: SortCriterion[]) => void;
}) {
  function updateCriterion(id: string, patch: Partial<SortCriterion>) {
    onChange(criteria.map((criterion) => (criterion.id === id ? { ...criterion, ...patch } : criterion)));
  }

  function removeCriterion(id: string) {
    onChange(criteria.filter((criterion) => criterion.id !== id));
  }

  function addCriterion() {
    onChange([...criteria, newCriterion()]);
  }

  return (
    <div className="glass-panel p-3 space-y-2">
      {criteria.map((criterion, index) => (
        <div key={criterion.id} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-400 w-16">{index === 0 ? 'Sort by' : 'then by'}</span>
          <select
            value={criterion.field}
            onChange={(e) => updateCriterion(criterion.id, { field: e.target.value })}
            className="glass-input"
          >
            {SORTABLE_FIELDS.map((field) => (
              <option key={field.key} value={field.key}>
                {field.label}
              </option>
            ))}
          </select>
          <select
            value={criterion.direction}
            onChange={(e) => updateCriterion(criterion.id, { direction: e.target.value as SortDirection })}
            className="glass-input"
          >
            <option value="asc">↑ ascending</option>
            <option value="desc">↓ descending</option>
          </select>
          <button type="button" onClick={() => removeCriterion(criterion.id)} className="text-red-600 text-sm hover:text-red-700">
            Remove
          </button>
        </div>
      ))}
      <div className="flex gap-3">
        <button type="button" onClick={addCriterion} className="text-sm text-indigo-600 hover:text-indigo-700">
          + Add sort level
        </button>
        {criteria.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-sm text-gray-500 hover:text-gray-700">
            Clear sort
          </button>
        )}
      </div>
    </div>
  );
}
