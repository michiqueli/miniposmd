'use client';

import { useMemo, useRef, useState } from 'react';
import { actualizarRolUsuario, desactivarUsuario } from '@/app/admin/usuarios/actions';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import TableControls, { type TableOption } from '@/components/ui/TableControls';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

type UsuarioRow = {
  id: string;
  nombre: string;
  rol: string;
  sucursalNombre: string;
};

type UsersTableProps = {
  usuarios: UsuarioRow[];
  sucursalOptions: TableOption[];
};

type SortKey = 'nombre-asc' | 'nombre-desc' | 'sucursal-asc' | 'sucursal-desc' | 'rol-asc' | 'rol-desc';

const ROLE_FILTERS: TableOption[] = [
  { label: 'Todos los roles', value: 'ALL' },
  { label: 'ADMIN', value: 'ADMIN' },
  { label: 'CASHIER', value: 'CASHIER' },
];

const SORT_OPTIONS: TableOption[] = [
  { label: 'Nombre (A-Z)', value: 'nombre-asc' },
  { label: 'Nombre (Z-A)', value: 'nombre-desc' },
  { label: 'Sucursal (A-Z)', value: 'sucursal-asc' },
  { label: 'Sucursal (Z-A)', value: 'sucursal-desc' },
  { label: 'Rol (A-Z)', value: 'rol-asc' },
  { label: 'Rol (Z-A)', value: 'rol-desc' },
];

export default function UsersTable({ usuarios, sucursalOptions }: UsersTableProps) {
  const [search, setSearch] = useState('');
  const [rolFilter, setRolFilter] = useState('ALL');
  const [sucursalFilter, setSucursalFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('nombre-asc');
  const [usuarioADesactivar, setUsuarioADesactivar] = useState<string | null>(null);
  const deactivateFormRef = useRef<HTMLFormElement | null>(null);

  const filteredAndSortedUsers = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    const filtered = usuarios.filter((usuario) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        usuario.nombre.toLowerCase().includes(normalizedQuery) ||
        usuario.rol.toLowerCase().includes(normalizedQuery) ||
        usuario.sucursalNombre.toLowerCase().includes(normalizedQuery);

      const matchesRol = rolFilter === 'ALL' || usuario.rol === rolFilter;
      const matchesSucursal = sucursalFilter === 'ALL' || usuario.sucursalNombre === sucursalFilter;

      return matchesSearch && matchesRol && matchesSucursal;
    });

    return filtered.sort((left, right) => {
      switch (sortKey) {
        case 'nombre-desc':
          return right.nombre.localeCompare(left.nombre, 'es-AR');
        case 'sucursal-asc':
          return left.sucursalNombre.localeCompare(right.sucursalNombre, 'es-AR');
        case 'sucursal-desc':
          return right.sucursalNombre.localeCompare(left.sucursalNombre, 'es-AR');
        case 'rol-asc':
          return left.rol.localeCompare(right.rol, 'es-AR');
        case 'rol-desc':
          return right.rol.localeCompare(left.rol, 'es-AR');
        case 'nombre-asc':
        default:
          return left.nombre.localeCompare(right.nombre, 'es-AR');
      }
    });
  }, [rolFilter, search, sortKey, sucursalFilter, usuarios]);

  return (
    <div className="space-y-4">
      <TableControls
        searchPlaceholder="Buscar por nombre, sucursal o rol"
        searchValue={search}
        onSearchChange={setSearch}
        filterLabel="Rol"
        filterValue={rolFilter}
        filterOptions={ROLE_FILTERS}
        onFilterChange={setRolFilter}
        extraFilter={{
          label: 'Sucursal',
          value: sucursalFilter,
          options: sucursalOptions,
          onChange: setSucursalFilter,
        }}
        sortLabel="Orden"
        sortValue={sortKey}
        sortOptions={SORT_OPTIONS}
        onSortChange={(value) => setSortKey(value as SortKey)}
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Sucursal</th>
              <th className="px-4 py-3 text-left">Rol</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedUsers.map((usuario) => (
              <tr key={usuario.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-800">{usuario.nombre}</td>
                <td className="px-4 py-3 text-slate-600">{usuario.sucursalNombre}</td>
                <td className="px-4 py-3">
                  <form action={actualizarRolUsuario.bind(null, usuario.id)} className="flex items-center gap-2">
                    <Select name="rol" defaultValue={usuario.rol === 'ADMIN' ? 'ADMIN' : 'CASHIER'} className="max-w-35">
                      <option value="CASHIER">CASHIER</option>
                      <option value="ADMIN">ADMIN</option>
                    </Select>
                    <Button variant="secondary" className="text-xs">
                      Guardar
                    </Button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Badge variant={usuario.rol === 'ADMIN' ? 'info' : 'neutral'}>
                      {usuario.rol === 'ADMIN' ? 'ADMIN' : 'CASHIER'}
                    </Badge>
                    <form ref={usuarioADesactivar === usuario.id ? deactivateFormRef : undefined} action={desactivarUsuario.bind(null, usuario.id)}>
                      <Button type="button" variant="danger" className="text-xs" onClick={() => setUsuarioADesactivar(usuario.id)}>
                        Desactivar
                      </Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}

            {filteredAndSortedUsers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                  No hay usuarios para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={!!usuarioADesactivar}
        title="Desactivar usuario"
        description="¿Seguro que querés desactivar este usuario?"
        confirmLabel="Sí, desactivar"
        onClose={() => setUsuarioADesactivar(null)}
        onConfirm={() => {
          deactivateFormRef.current?.requestSubmit();
          setUsuarioADesactivar(null);
        }}
      />
    </div>
  );
}
