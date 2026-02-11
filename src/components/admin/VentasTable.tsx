'use client'

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, FileText, Filter } from 'lucide-react';
import { anularVenta, actualizarVenta } from '@/app/admin/ventas/actions';
import { facturarVenta } from '@/app/pos/actions';
import FacturacionModal from '@/components/modals/FacturacionModal';
import TableControls, { type TableOption } from '@/components/ui/TableControls';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type VentaRow = {
  id: string;
  numeroVenta: number;
  createdAt: string;
  fecha: string;
  total: number;
  metodoPago: string;
  estadoPago: string;
  nroFactura: number | null;
  tipoFactura: string | null;
  cae: string | null;
  sucursalNombre: string;
  usuarioNombre: string;
};

type VentasTableProps = {
  ventas: VentaRow[];
  sucursalOptions: TableOption[];
  usuarioOptions: TableOption[];
};

type SortKey =
  | 'fecha-desc'
  | 'fecha-asc'
  | 'monto-desc'
  | 'monto-asc'
  | 'factura-desc'
  | 'factura-asc';

const METODO_FILTERS: TableOption[] = [
  { label: 'Todos los métodos', value: 'ALL' },
  { label: 'Efectivo', value: 'EFECTIVO' },
  { label: 'Mercado Pago', value: 'MP' },
];

const FACTURA_FILTERS: TableOption[] = [
  { label: 'Todas', value: 'ALL' },
  { label: 'Facturadas', value: 'FACTURADA' },
  { label: 'Sin factura', value: 'PENDIENTE' },
];

const SORT_OPTIONS: TableOption[] = [
  { label: 'Fecha (más reciente)', value: 'fecha-desc' },
  { label: 'Fecha (más antigua)', value: 'fecha-asc' },
  { label: 'Monto (mayor)', value: 'monto-desc' },
  { label: 'Monto (menor)', value: 'monto-asc' },
  { label: 'Factura (número mayor)', value: 'factura-desc' },
  { label: 'Factura (número menor)', value: 'factura-asc' },
];

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function VentasTable({ ventas, sucursalOptions, usuarioOptions }: VentasTableProps) {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [metodoFilter, setMetodoFilter] = useState('ALL');
  const [sucursalFilter, setSucursalFilter] = useState('ALL');
  const [usuarioFilter, setUsuarioFilter] = useState('ALL');
  const [facturaFilter, setFacturaFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('fecha-desc');

  const [ventaAFacturar, setVentaAFacturar] = useState<string | null>(null);
  const [cargandoFactura, setCargandoFactura] = useState(false);

  const filteredAndSortedVentas = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = ventas.filter((venta) => {
      const isFacturada = Boolean(venta.nroFactura);

      const matchesSearch =
        query.length === 0 ||
        String(venta.numeroVenta).includes(query) ||
        venta.usuarioNombre.toLowerCase().includes(query) ||
        venta.sucursalNombre.toLowerCase().includes(query) ||
        venta.metodoPago.toLowerCase().includes(query) ||
        (venta.nroFactura ? String(venta.nroFactura).includes(query) : false);

      const matchesMetodo = metodoFilter === 'ALL' || venta.metodoPago === metodoFilter;
      const matchesSucursal = sucursalFilter === 'ALL' || venta.sucursalNombre === sucursalFilter;
      const matchesUsuario = usuarioFilter === 'ALL' || venta.usuarioNombre === usuarioFilter;
      const matchesFactura =
        facturaFilter === 'ALL' ||
        (facturaFilter === 'FACTURADA' && isFacturada) ||
        (facturaFilter === 'PENDIENTE' && !isFacturada);

      return matchesSearch && matchesMetodo && matchesSucursal && matchesUsuario && matchesFactura;
    });

    return filtered.sort((a, b) => {
      switch (sortKey) {
        case 'fecha-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'monto-desc':
          return b.total - a.total;
        case 'monto-asc':
          return a.total - b.total;
        case 'factura-desc':
          return (b.nroFactura ?? 0) - (a.nroFactura ?? 0);
        case 'factura-asc':
          return (a.nroFactura ?? 0) - (b.nroFactura ?? 0);
        case 'fecha-desc':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [facturaFilter, metodoFilter, search, sortKey, sucursalFilter, usuarioFilter, ventas]);

  const handleDelete = async (id: string) => {
    if (confirm('¿Seguro que querés ANULAR esta venta? Esto no se puede deshacer.')) {
      await anularVenta(id);
    }
  };

  const handleConfirmFactura = async (datos: { tipo: string, receptorId: string }) => {
    if (!ventaAFacturar) return;

    setCargandoFactura(true);
    const res = await facturarVenta(ventaAFacturar, datos);

    if (res.success) {
      alert(`✅ Factura Generada: CAE ${res.cae}`);
      setVentaAFacturar(null);
      router.refresh();
    } else {
      alert(`❌ Error AFIP: ${res.error}`);
    }
    setCargandoFactura(false);
  };

  return (
    <>
      <div className="space-y-4">
        <TableControls
          searchPlaceholder="Buscar por N° venta, usuario, sucursal, método o factura"
          searchValue={search}
          onSearchChange={setSearch}
          filterLabel="Método"
          filterValue={metodoFilter}
          filterOptions={METODO_FILTERS}
          onFilterChange={setMetodoFilter}
          extraFilters={[
            {
              label: 'Sucursal',
              value: sucursalFilter,
              options: sucursalOptions,
              onChange: setSucursalFilter,
            },
            {
              label: 'Usuario',
              value: usuarioFilter,
              options: usuarioOptions,
              onChange: setUsuarioFilter,
            },
            {
              label: 'Factura',
              value: facturaFilter,
              options: FACTURA_FILTERS,
              onChange: setFacturaFilter,
            },
          ]}
          sortLabel="Orden"
          sortValue={sortKey}
          sortOptions={SORT_OPTIONS}
          onSortChange={(value) => setSortKey(value as SortKey)}
        />

        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase font-semibold text-xs">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Venta</th>
                <th className="px-4 py-3">Sucursal</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Factura</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedVentas.map((venta) => (
                <tr key={venta.id} className="border-b border-slate-100 align-top hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(venta.createdAt).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-3 font-semibold">#{venta.numeroVenta}</td>
                  <td className="px-4 py-3 text-slate-600">{venta.sucursalNombre}</td>
                  <td className="px-4 py-3 text-slate-600">{venta.usuarioNombre}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{formatCurrency(venta.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${venta.metodoPago === 'MP' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {venta.metodoPago}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${venta.estadoPago === 'PAGADO' ? 'bg-emerald-100 text-emerald-700' : venta.estadoPago === 'ANULADO' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {venta.estadoPago}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {venta.nroFactura ? (
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-blue-600">FC-{venta.nroFactura}</span>
                        <span className="text-[10px] text-slate-400">CAE: {venta.cae}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Pendiente</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!venta.nroFactura && (
                        <button
                          onClick={() => setVentaAFacturar(venta.id)}
                          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs font-bold shadow-sm"
                          title="Generar Factura AFIP"
                        >
                          <FileText size={14} /> AFIP
                        </button>
                      )}

                      <details className="group">
                        <summary className="flex cursor-pointer list-none items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                          <Filter size={14} /> Editar
                        </summary>

                        <form action={actualizarVenta} className="absolute right-6 z-10 mt-2 w-80 space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                          <input type="hidden" name="ventaId" value={venta.id} />

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">Método de pago</label>
                            <Select name="metodoPago" defaultValue={venta.metodoPago}>
                              <option value="EFECTIVO">EFECTIVO</option>
                              <option value="MP">MERCADO PAGO</option>
                            </Select>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">Estado de pago</label>
                            <Select name="estadoPago" defaultValue={venta.estadoPago}>
                              <option value="PENDIENTE">PENDIENTE</option>
                              <option value="PAGADO">PAGADO</option>
                              <option value="ANULADO">ANULADO</option>
                            </Select>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">Tipo de factura</label>
                            <Input name="tipoFactura" defaultValue={venta.tipoFactura ?? ''} placeholder="A / B / C" />
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <Button type="submit" size="sm">Guardar cambios</Button>
                          </div>
                        </form>
                      </details>

                      <button onClick={() => handleDelete(venta.id)} className="p-2 text-red-500 hover:bg-red-50 rounded" title="Anular venta">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredAndSortedVentas.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    No hay ventas que coincidan con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FacturacionModal
        isOpen={!!ventaAFacturar}
        onClose={() => setVentaAFacturar(null)}
        onConfirm={handleConfirmFactura}
        cargando={cargandoFactura}
      />
    </>
  );
}
