import { db } from "@/lib/db";
import { crearProducto } from "./actions";
import { requireRole } from '@/lib/auth';
import AdminNav from '@/components/admin/AdminNav';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import ProductsTable from '@/components/admin/ProductsTable';
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

    const productosTabla = productos.map((producto) => ({
        id: producto.id,
        nombre: producto.nombre,
        categoria: producto.categoria,
        precioEfectivo: Number(producto.precioEfectivo.toString()),
        precioDigital: Number(producto.precioDigital.toString()),
        stocks: producto.stocks.map((stock: { sucursalId: string; cantidad: number }) => ({
            sucursalId: stock.sucursalId,
            cantidad: Number(stock.cantidad),
        })),
    }));

    return (
        <div className="p-8 min-h-screen bg-slate-50">
            <AdminNav />
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Gestión de Productos</h1>

            <Card className="mb-6">
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

            <ProductsTable productos={productosTabla} sucursales={sucursales} />
        </div>
    );
}
