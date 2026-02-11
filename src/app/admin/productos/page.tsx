import { db } from "@/lib/db";
import { crearProducto } from "./actions";
import { requireRole } from '@/lib/auth';
import AdminNav from '@/components/admin/AdminNav';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

export default async function ProductosPage() {
    await requireRole(['ADMIN']);
    const productos = await db.producto.findMany({ where: { deletedAt: null } });

    return (
        <div className="p-8">
            <AdminNav />
            <h1 className="text-2xl font-bold mb-6">Gestionar Productos (Pollería)</h1>

            <form action={crearProducto} className="flex flex-wrap gap-4 mb-8 bg-slate-100 p-4 rounded-lg">
                <Input name="nombre" placeholder="Nombre" className="flex-1" required />

                <div className="flex flex-col">
                    <label className="text-xs text-gray-500 ml-1">Precio Efectivo</label>
                    <Input name="precioEfectivo" type="number" step="0.01" placeholder="$ Efectivo" className="w-32" required />
                </div>

                <div className="flex flex-col">
                    <label className="text-xs text-gray-500 ml-1">Precio Digital (MP)</label>
                    <Input name="precioDigital" type="number" step="0.01" placeholder="$ Digital" className="w-32" required />
                </div>

                <Select name="categoria" className="self-end">
                    <option value="POLLO">Pollo</option>
                    <option value="PAPAS">Papas</option>
                    <option value="BEBIDA">Bebida</option>
                </Select>

                <Button type="submit" className="bg-orange-600 text-white px-6 py-2 self-end hover:bg-orange-700">
                    Guardar
                </Button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productos.map((p: any) => (
                    <Card key={p.id} className="p-4 rounded-xl">
                        <h3 className="font-bold text-lg uppercase">{p.nombre}</h3>
                        <p className="text-xs text-slate-400 mb-2">{p.categoria}</p>
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
                    </Card>
                ))}
            </div>
        </div>
    );
}
