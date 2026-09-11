'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Apartment, Document, Image as ApartmentImage } from '@prisma/client';
import { ApartmentCard } from '@/components/ApartmentCard';
import { AddApartmentCard } from '@/components/AddApartmentCard';
import { ApartmentTable } from '@/components/ApartmentTable';
import { FilterBuilder } from '@/components/FilterBuilder';
import { SortBuilder } from '@/components/SortBuilder';
import { ColumnPicker } from '@/components/ColumnPicker';
import { useLocalStorageState } from '@/lib/hooks/useLocalStorageState';
import { matchesAllFilters, type FilterCondition } from '@/lib/apartments/filterApartments';
import { matchesSearch } from '@/lib/apartments/searchApartments';
import { sortApartments, type SortCriterion } from '@/lib/apartments/sortApartments';
import { getField, DEFAULT_TABLE_COLUMNS } from '@/lib/apartments/fields';

type ApartmentWithRelations = Apartment & { images: ApartmentImage[]; documents: Document[] };

type ViewMode = 'card' | 'table';
type OpenPanel = 'filter' | 'sort' | 'columns' | null;

export function ApartmentBrowser({ apartments }: { apartments: ApartmentWithRelations[] }) {
  const [viewMode, setViewMode] = useLocalStorageState<ViewMode>('flatTracker.viewMode', 'card');
  const [columns, setColumns] = useLocalStorageState<string[]>('flatTracker.tableColumns', DEFAULT_TABLE_COLUMNS);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sortCriteria, setSortCriteria] = useState<SortCriterion[]>([
    { id: 'default-viewing-date', field: 'viewingDate', direction: 'asc' },
  ]);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [showAddCard, setShowAddCard] = useState(false);

  const visibleApartments = useMemo(() => {
    const filtered = apartments.filter(
      (apartment) => matchesSearch(apartment, search) && matchesAllFilters(apartment, filters),
    );
    return sortApartments(filtered, sortCriteria);
  }, [apartments, search, filters, sortCriteria]);

  function togglePanel(panel: Exclude<OpenPanel, null>) {
    setOpenPanel((current) => (current === panel ? null : panel));
  }

  function removeFilter(id: string) {
    setFilters(filters.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel flex flex-wrap items-center gap-3 p-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          className="glass-input flex-1 min-w-[160px]"
        />
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={viewMode === 'card' ? 'btn-secondary-active' : 'btn-secondary'}
          >
            Cards
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={viewMode === 'table' ? 'btn-secondary-active' : 'btn-secondary'}
          >
            Table
          </button>
        </div>
        <button
          type="button"
          onClick={() => togglePanel('filter')}
          className={openPanel === 'filter' ? 'btn-secondary-active' : 'btn-secondary'}
        >
          Filter{filters.length > 0 ? ` (${filters.length})` : ''}
        </button>
        <button
          type="button"
          onClick={() => togglePanel('sort')}
          className={openPanel === 'sort' ? 'btn-secondary-active' : 'btn-secondary'}
        >
          Sort{sortCriteria.length > 0 ? ` (${sortCriteria.length})` : ''}
        </button>
        <Link href="/scratchpad" className="btn-secondary">
          Scratchpad
        </Link>
        {viewMode === 'table' && (
          <>
            <button
              type="button"
              onClick={() => togglePanel('columns')}
              className={openPanel === 'columns' ? 'btn-secondary-active' : 'btn-secondary'}
            >
              Columns
            </button>
            <button type="button" onClick={() => setShowAddCard((shown) => !shown)} className="btn-secondary">
              + Add apartment
            </button>
          </>
        )}
      </div>

      {openPanel === 'filter' && <FilterBuilder conditions={filters} onChange={setFilters} />}
      {openPanel === 'sort' && <SortBuilder criteria={sortCriteria} onChange={setSortCriteria} />}
      {viewMode === 'table' && openPanel === 'columns' && <ColumnPicker selected={columns} onChange={setColumns} />}

      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <span
              key={filter.id}
              className="text-xs bg-white/70 dark:bg-white/5 backdrop-blur-sm border border-white/60 dark:border-white/10 rounded-full px-3 py-1 flex items-center gap-1 shadow-sm dark:shadow-none"
            >
              {getField(filter.field)?.label ?? filter.field} {filter.operator} {filter.value}
              <button
                type="button"
                onClick={() => removeFilter(filter.id)}
                className="text-gray-500 dark:text-white/40 hover:text-red-600 dark:hover:text-red-400"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {viewMode === 'table' && showAddCard && (
        <div className="max-w-sm">
          <AddApartmentCard />
        </div>
      )}

      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AddApartmentCard />
          {visibleApartments.map((apartment) => (
            <ApartmentCard key={apartment.id} apartment={apartment} />
          ))}
        </div>
      ) : (
        <ApartmentTable
          apartments={visibleApartments}
          columns={columns}
          sortCriteria={sortCriteria}
          onSortChange={setSortCriteria}
        />
      )}
    </div>
  );
}
