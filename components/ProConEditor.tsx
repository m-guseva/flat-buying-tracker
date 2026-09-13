'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { ProConItem } from '@prisma/client';
import { addProConItemAction, updateProConItemAction, deleteProConItemAction } from '@/app/actions/proCons';

const WEIGHTS = [1, 2, 3, 4, 5];

function ProConRow({
  apartmentId,
  item,
  onDelete,
}: {
  apartmentId: string;
  item: ProConItem;
  onDelete: (id: string) => void;
}) {
  const [text, setText] = useState(item.text);
  const [weight, setWeight] = useState(item.weight);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleTextChange(value: string) {
    setText(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updateProConItemAction(apartmentId, item.id, { text: value });
    }, 800);
  }

  function handleWeightChange(value: number) {
    setWeight(value);
    updateProConItemAction(apartmentId, item.id, { weight: value });
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <input
        type="text"
        value={text}
        onChange={(event) => handleTextChange(event.target.value)}
        placeholder={item.type === 'PRO' ? 'Pro…' : 'Con…'}
        className="glass-input flex-1 min-w-0"
      />
      <select
        value={weight}
        onChange={(event) => handleWeightChange(Number(event.target.value))}
        aria-label="Importance weight"
        className="glass-input shrink-0"
      >
        {WEIGHTS.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="shrink-0 text-red-600 dark:text-red-400 text-sm hover:text-red-700 dark:hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Remove
      </button>
    </div>
  );
}

function ProConList({
  apartmentId,
  type,
  label,
  items,
  onAdd,
  onDelete,
}: {
  apartmentId: string;
  type: 'PRO' | 'CON';
  label: string;
  items: ProConItem[];
  onAdd: (type: 'PRO' | 'CON') => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-2 min-w-0">
      <h3 className={`text-sm font-medium ${type === 'PRO' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
        {label}
      </h3>
      {items.map((item) => (
        <ProConRow key={item.id} apartmentId={apartmentId} item={item} onDelete={onDelete} />
      ))}
      <button
        type="button"
        onClick={() => onAdd(type)}
        className="text-sm text-[var(--accent-1)] hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        + Add {type === 'PRO' ? 'pro' : 'con'}
      </button>
    </div>
  );
}

export function ProConEditor({ apartmentId, items }: { apartmentId: string; items: ProConItem[] }) {
  const [list, setList] = useState(items);
  const [, startTransition] = useTransition();

  function handleAdd(type: 'PRO' | 'CON') {
    startTransition(async () => {
      const created = await addProConItemAction(apartmentId, type);
      setList((current) => [...current, created]);
    });
  }

  function handleDelete(id: string) {
    setList((current) => current.filter((item) => item.id !== id));
    startTransition(() => {
      deleteProConItemAction(apartmentId, id);
    });
  }

  const pros = list.filter((item) => item.type === 'PRO');
  const cons = list.filter((item) => item.type === 'CON');

  return (
    <div className="space-y-4">
      <ProConList apartmentId={apartmentId} type="PRO" label="Pros" items={pros} onAdd={handleAdd} onDelete={handleDelete} />
      <ProConList apartmentId={apartmentId} type="CON" label="Cons" items={cons} onAdd={handleAdd} onDelete={handleDelete} />
    </div>
  );
}
