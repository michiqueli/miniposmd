import { db } from "@/lib/db";
import { crearProducto } from "./actions";

export default async function ProductosPage() {
    const productos = await db.producto.findMany();

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Gestionar Productos (Pollería)</h1>

            {/* Formulario simple */}
            <form action={crearProducto} className="flex flex-wrap gap-4 mb-8 bg-slate-100 p-4 rounded-lg">
                <input name="nombre" placeholder="Nombre" className="p-2 border rounded flex-1" required />

                <div className="flex flex-col">
                    <label className="text-xs text-gray-500 ml-1">Precio Efectivo</label>
                    <input name="precioEfectivo" type="number" step="0.01" placeholder="$ Efectivo" className="p-2 border rounded w-32" required />
                </div>

                <div className="flex flex-col">
                    <label className="text-xs text-gray-500 ml-1">Precio Digital (MP)</label>
                    <input name="precioDigital" type="number" step="0.01" placeholder="$ Digital" className="p-2 border rounded w-32" required />
                </div>

                <select name="categoria" className="p-2 border rounded self-end">
                    <option value="POLLO">Pollo</option>
                    <option value="PAPAS">Papas</option>
                    <option value="BEBIDA">Bebida</option>
                </select>

                <button type="submit" className="bg-orange-600 text-white px-6 py-2 rounded font-bold self-end hover:bg-orange-700 transition-colors">
                    Guardar
                </button>
            </form>

            {/* En la lista de productos, mostramos ambos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productos.map((p: any) => (
                    <div key={p.id} className="border p-4 rounded-xl shadow-sm bg-white border-slate-200">
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
                    </div>
                ))}
            </div>
        </div>
    );
}