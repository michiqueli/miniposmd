import { db } from "@/lib/db";
import { actualizarProducto, crearProducto, eliminarProducto } from "./actions";
import { requireRole } from '@/lib/auth';
import AdminNav from '@/components/admin/AdminNav';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

type ProductoListado = {
    id: string;
    nombre: string;
    categoria: string;
    precioEfectivo: { toString(): string };
    precioDigital: { toString(): string };
    stocks: Array<{ sucursalId: string; cantidad: number }>;
};

type SucursalListado = { id: string; nombre: string };

export default async function ProductosPage() {
    await requireRole(['ADMIN']);

    const [productos, sucursales]: [ProductoListado[], SucursalListado[]] = await Promise.all([
        db.producto.findMany({
            where: { deletedAt: null },
            include: {
                stocks: {
                    where: { deletedAt: null },
                    select: { sucursalId: true, cantidad: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        }),
        db.sucursal.findMany({
            where: { deletedAt: null },
            select: { id: true, nombre: true },
            orderBy: { nombre: 'asc' },
        }),
    ]);

    return (
        <div className="p-8 space-y-6">
            <AdminNav />
            <h1 className="text-2xl font-bold">Gestionar Productos (Pollería)</h1>

            <Card>
                <CardHeader>
                    <h2 className="text-lg font-semibold">Crear producto</h2>
                </CardHeader>
                <CardContent>
                    <form action={crearProducto} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Input name="nombre" placeholder="Nombre" required />

                            <div>
                                <label className="text-xs text-gray-500 ml-1">Precio Efectivo</label>
                                <Input name="precioEfectivo" type="number" step="0.01" min="0" placeholder="$ Efectivo" required />
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 ml-1">Precio Digital (MP)</label>
                                <Input name="precioDigital" type="number" step="0.01" min="0" placeholder="$ Digital" required />
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 ml-1">Categoría</label>
                                <Select name="categoria" required>
                                    <option value="POLLO">Pollo</option>
                                    <option value="PAPAS">Papas</option>
                                    <option value="BEBIDA">Bebida</option>
                                </Select>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                            <p className="font-medium mb-2">Stock por sucursal</p>
                            <p className="text-xs text-slate-500 mb-3">Marcá sucursal y definí cantidad. Si no se marca, no se crea stock para esa sucursal.</p>
                            <div className="space-y-2">
                                {sucursales.map((sucursal: SucursalListado) => (
                                    <label key={sucursal.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 bg-white">
                                        <input type="checkbox" name={`stockEnabled_${sucursal.id}`} className="size-4" />
                                        <span className="min-w-40 text-sm font-medium">{sucursal.nombre}</span>
                                        <Input
                                            name={`stockQty_${sucursal.id}`}
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            defaultValue="0"
                                            className="max-w-28"
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>

                        <Button type="submit">Guardar producto</Button>
                    </form>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {productos.map((p: ProductoListado) => {
                    const stockMap = new Map(p.stocks.map((stock: { sucursalId: string; cantidad: number }) => [stock.sucursalId, Number(stock.cantidad)] as const));

                    return (
                        <Card key={p.id}>
                            <CardHeader className="flex flex-col gap-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-bold text-lg uppercase">{p.nombre}</h3>
                                        <p className="text-xs text-slate-400">{p.categoria}</p>
                                    </div>
                                    <form action={eliminarProducto}>
                                        <input type="hidden" name="productoId" value={p.id} />
                                        <Button type="submit" variant="danger" size="sm">Eliminar</Button>
                                    </form>
                                </div>
                                <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                    <div>
                                        <span className="text-[10px] block text-gray-500">EFECTIVO</span>
                                        <span className="font-bold text-green-600">${p.precioEfectivo.toString()}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] block text-gray-500">DIGITAL / MP</span>
                                        <span className="font-bold text-blue-600">${p.precioDigital.toString()}</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <details>
                                    <summary className="cursor-pointer text-sm font-medium text-slate-700">Editar producto y stock</summary>
                                    <form action={actualizarProducto} className="mt-4 space-y-4">
                                        <input type="hidden" name="productoId" value={p.id} />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <Input name="nombre" defaultValue={p.nombre} required />

                                            <Select name="categoria" defaultValue={p.categoria} required>
                                                <option value="POLLO">Pollo</option>
                                                <option value="PAPAS">Papas</option>
                                                <option value="BEBIDA">Bebida</option>
                                            </Select>

                                            <Input name="precioEfectivo" type="number" min="0" step="0.01" defaultValue={p.precioEfectivo.toString()} required />
                                            <Input name="precioDigital" type="number" min="0" step="0.01" defaultValue={p.precioDigital.toString()} required />
                                        </div>

                                        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-2">
                                            {sucursales.map((sucursal: SucursalListado) => {
                                                const cantidadActual = stockMap.get(sucursal.id);
                                                return (
                                                    <label key={`${p.id}-${sucursal.id}`} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 bg-white">
                                                        <input
                                                            type="checkbox"
                                                            name={`stockEnabled_${sucursal.id}`}
                                                            defaultChecked={cantidadActual !== undefined}
                                                            className="size-4"
                                                        />
                                                        <span className="min-w-40 text-sm font-medium">{sucursal.nombre}</span>
                                                        <Input
                                                            name={`stockQty_${sucursal.id}`}
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            defaultValue={cantidadActual ?? 0 as number}
                                                            className="max-w-28"
                                                        />
                                                    </label>
                                                );
                                            })}
                                        </div>

                                        <Button type="submit" size="sm">Guardar cambios</Button>
                                    </form>
                                </details>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
