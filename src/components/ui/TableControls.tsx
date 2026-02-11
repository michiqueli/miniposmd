'use client';

import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

export type TableOption = {
  label: string;
  value: string;
};

export type ExtraFilter = {
  label?: string;
  value: string;
  options: TableOption[];
  onChange: (value: string) => void;
};

type TableControlsProps = {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filterLabel?: string;
  filterValue: string;
  filterOptions: TableOption[];
  onFilterChange: (value: string) => void;
  extraFilter?: ExtraFilter;
  extraFilters?: ExtraFilter[];
  sortLabel?: string;
  sortValue: string;
  sortOptions: TableOption[];
  onSortChange: (value: string) => void;
};

export default function TableControls({
  searchPlaceholder = 'Buscar...',
  searchValue,
  onSearchChange,
  filterLabel = 'Filtrar',
  filterValue,
  filterOptions,
  onFilterChange,
  extraFilter,
  extraFilters,
  sortLabel = 'Ordenar por',
  sortValue,
  sortOptions,
  onSortChange,
}: TableControlsProps) {
  const secondaryFilters = [...(extraFilters ?? []), ...(extraFilter ? [extraFilter] : [])];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Buscar</label>
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">{filterLabel}</label>
          <Select value={filterValue} onChange={(event) => onFilterChange(event.target.value)}>
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {secondaryFilters.map((filter, index) => (
          <div key={`${filter.label ?? 'filtro'}-${index}`}>
            <label className="mb-1 block text-xs font-medium text-slate-500">{filter.label ?? 'Filtro'}</label>
            <Select value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        ))}

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">{sortLabel}</label>
          <Select value={sortValue} onChange={(event) => onSortChange(event.target.value)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
