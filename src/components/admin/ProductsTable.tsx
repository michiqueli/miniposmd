'use client';

import { useMemo, useState } from 'react';
import { actualizarProducto, eliminarProducto } from '@/app/admin/productos/actions';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import TableControls, { type TableOption } from '@/components/ui/TableControls';

type ProductoRow = {
  id: string;
  nombre: string;
  categoria: string;
  precioEfectivo: number;
  precioDigital: number;
  stocks: Array<{ sucursalId: string; cantidad: number }>;
};

type SucursalListado = { id: string; nombre: string };

type ProductsTableProps = {
  productos: ProductoRow[];
  sucursales: SucursalListado[];
};

type SortKey =
  | 'name-asc'
  | 'name-desc'
  | 'efectivo-asc'
  | 'efectivo-desc'
  | 'digital-asc'
  | 'digital-desc';

const CATEGORY_FILTERS: TableOption[] = [
  { label: 'Todas las categorías', value: 'ALL' },
  { label: 'Pollo', value: 'POLLO' },
  { label: 'Papas', value: 'PAPAS' },
  { label: 'Bebida', value: 'BEBIDA' },
];

const SORT_OPTIONS: TableOption[] = [
  { label: 'Nombre (A-Z)', value: 'name-asc' },
  { label: 'Nombre (Z-A)', value: 'name-desc' },
  { label: 'Efectivo (menor a mayor)', value: 'efectivo-asc' },
  { label: 'Efectivo (mayor a menor)', value: 'efectivo-desc' },
  { label: 'Digital (menor a mayor)', value: 'digital-asc' },
  { label: 'Digital (mayor a menor)', value: 'digital-desc' },
];

function formatPrice(value: number) {
  return value.toFixed(2);
}

export default function ProductsTable({ productos, sucursales }: ProductsTableProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name-asc');

  const filteredAndSortedProducts = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    const filtered = productos.filter((producto) => {
      const matchesCategory = categoryFilter === 'ALL' || producto.categoria === categoryFilter;
      const matchesSearch =
        normalizedQuery.length === 0 ||
        producto.nombre.toLowerCase().includes(normalizedQuery) ||
        producto.categoria.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });

    return filtered.sort((left, right) => {
      switch (sortKey) {
        case 'name-desc':
          return right.nombre.localeCompare(left.nombre, 'es-AR');
        case 'efectivo-asc':
          return left.precioEfectivo - right.precioEfectivo;
        case 'efectivo-desc':
          return right.precioEfectivo - left.precioEfectivo;
        case 'digital-asc':
          return left.precioDigital - right.precioDigital;
        case 'digital-desc':
          return right.precioDigital - left.precioDigital;
        case 'name-asc':
        default:
          return left.nombre.localeCompare(right.nombre, 'es-AR');
      }
    });
  }, [categoryFilter, productos, search, sortKey]);

  return (
    <div className="space-y-4">
      <TableControls
        searchPlaceholder="Buscar por nombre o categoría"
        searchValue={search}
        onSearchChange={setSearch}
        filterLabel="Categoría"
        filterValue={categoryFilter}
        filterOptions={CATEGORY_FILTERS}
        onFilterChange={setCategoryFilter}
        sortLabel="Orden"
        sortValue={sortKey}
        sortOptions={SORT_OPTIONS}
        onSortChange={(value) => setSortKey(value as SortKey)}
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Precio efectivo</th>
              <th className="px-4 py-3">Precio digital</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedProducts.map((producto) => {
              const stockMap = new Map(
                producto.stocks.map((stock: { sucursalId: string; cantidad: number }) => [
                  stock.sucursalId,
                  Number(stock.cantidad),
                ] as const),
              );

              return (
                <tr key={producto.id} className="border-t border-slate-200 align-top">
                  <td className="px-4 py-3 font-semibold uppercase">{producto.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{producto.categoria}</td>
                  <td className="px-4 py-3 text-green-700">${formatPrice(producto.precioEfectivo)}</td>
                  <td className="px-4 py-3 text-blue-700">${formatPrice(producto.precioDigital)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <details className="group w-full max-w-xl rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <summary className="cursor-pointer list-none text-right text-sm font-medium text-slate-700">
                          <span className="group-open:hidden">Editar</span>
                          <span className="hidden group-open:inline">Cerrar edición</span>
                        </summary>
                        <form action={actualizarProducto} className="mt-3 space-y-3">
                          <input type="hidden" name="productoId" value={producto.id} />

                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Input name="nombre" defaultValue={producto.nombre} required />

                            <Select name="categoria" defaultValue={producto.categoria} required>
                              <option value="POLLO">Pollo</option>
                              <option value="PAPAS">Papas</option>
                              <option value="BEBIDA">Bebida</option>
                            </Select>

                            <Input
                              name="precioEfectivo"
                              type="number"
                              min="0"
                              step="0.01"
                              defaultValue={producto.precioEfectivo}
                              required
                            />
                            <Input
                              name="precioDigital"
                              type="number"
                              min="0"
                              step="0.01"
                              defaultValue={producto.precioDigital}
                              required
                            />
                          </div>

                          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                            {sucursales.map((sucursal) => {
                              const cantidadActual = stockMap.get(sucursal.id);
                              return (
                                <label
                                  key={`${producto.id}-${sucursal.id}`}
                                  className="flex items-center gap-2 rounded-lg border border-slate-200 p-2"
                                >
                                  <input
                                    type="checkbox"
                                    name={`stockEnabled_${sucursal.id}`}
                                    defaultChecked={cantidadActual !== undefined}
                                    className="size-4"
                                  />
                                  <span className="min-w-28 text-xs font-medium text-slate-700 md:text-sm">
                                    {sucursal.nombre}
                                  </span>
                                  <Input
                                    name={`stockQty_${sucursal.id}`}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    defaultValue={cantidadActual ?? 0}
                                    className="max-w-28"
                                  />
                                </label>
                              );
                            })}
                          </div>

                          <div className="flex justify-end">
                            <Button type="submit" size="sm">
                              Guardar cambios
                            </Button>
                          </div>
                        </form>
                      </details>

                      <form action={eliminarProducto}>
                        <input type="hidden" name="productoId" value={producto.id} />
                        <Button type="submit" variant="danger" size="sm">
                          Eliminar
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredAndSortedProducts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                  No hay productos para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
