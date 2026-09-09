'use client';

import { FILTERABLE_FIELDS, getField, type FieldDef } from '@/lib/apartments/fields';
import type { FilterCondition, FilterOperator } from '@/lib/apartments/filterApartments';

const OPERATORS_BY_TYPE: Record<FieldDef['type'], { value: FilterOperator; label: string }[]> = {
  text: [{ value: 'contains', label: 'contains' }],
  number: [
    { value: 'eq', label: '=' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '<=' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '>=' },
  ],
  boolean: [{ value: 'eq', label: '=' }],
  select: [{ value: 'eq', label: '=' }],
};

function defaultValueFor(field: FieldDef): string {
  if (field.type === 'boolean') return 'true';
  if (field.type === 'select') return field.options?.[0]?.value ?? '';
  return '';
}

function newCondition(): FilterCondition {
  const field = FILTERABLE_FIELDS[0];
  return {
    id: crypto.randomUUID(),
    field: field.key,
    operator: OPERATORS_BY_TYPE[field.type][0].value,
    value: defaultValueFor(field),
  };
}

export function FilterBuilder({
  conditions,
  onChange,
}: {
  conditions: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
}) {
  function updateCondition(id: string, patch: Partial<FilterCondition>) {
    onChange(conditions.map((condition) => (condition.id === id ? { ...condition, ...patch } : condition)));
  }

  function changeField(id: string, fieldKey: string) {
    const field = getField(fieldKey);
    if (!field) return;
    updateCondition(id, {
      field: fieldKey,
      operator: OPERATORS_BY_TYPE[field.type][0].value,
      value: defaultValueFor(field),
    });
  }

  function removeCondition(id: string) {
    onChange(conditions.filter((condition) => condition.id !== id));
  }

  function addCondition() {
    onChange([...conditions, newCondition()]);
  }

  return (
    <div className="glass-panel p-3 space-y-2">
      {conditions.map((condition) => {
        const field = getField(condition.field) ?? FILTERABLE_FIELDS[0];
        return (
          <div key={condition.id} className="flex flex-wrap items-center gap-2 text-sm">
            <select
              value={condition.field}
              onChange={(e) => changeField(condition.id, e.target.value)}
              className="glass-input"
            >
              {FILTERABLE_FIELDS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
            <select
              value={condition.operator}
              onChange={(e) => updateCondition(condition.id, { operator: e.target.value as FilterOperator })}
              className="glass-input"
            >
              {OPERATORS_BY_TYPE[field.type].map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
            {field.type === 'boolean' ? (
              <select
                value={condition.value}
                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                className="glass-input"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : field.type === 'select' ? (
              <select
                value={condition.value}
                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                className="glass-input"
              >
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                value={condition.value}
                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                className="glass-input w-28"
              />
            )}
            <button type="button" onClick={() => removeCondition(condition.id)} className="text-red-600 text-sm hover:text-red-700">
              Remove
            </button>
          </div>
        );
      })}
      <div className="flex gap-3">
        <button type="button" onClick={addCondition} className="text-sm text-indigo-600 hover:text-indigo-700">
          + Add filter
        </button>
        {conditions.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-sm text-gray-500 hover:text-gray-700">
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
