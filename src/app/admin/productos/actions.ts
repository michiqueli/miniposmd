'use server'
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function crearProducto(formData: FormData) {
  const nombre = formData.get('nombre') as string;
  const precioEfectivo = parseFloat(formData.get('precioEfectivo') as string);
  const precioDigital = parseFloat(formData.get('precioDigital') as string);
  const categoria = formData.get('categoria') as string;

  await db.producto.create({
    data: {
      nombre,
      precioEfectivo,
      precioDigital,
      categoria,
    }
  });

  revalidatePath('/admin/productos');
}