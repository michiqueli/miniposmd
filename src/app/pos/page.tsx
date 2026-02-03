import { db } from "@/lib/db";
import PosShell from "./components/PosShell";

export default async function PosPage() {
  const productosRaw = await db.producto.findMany({
    orderBy: { nombre: 'asc' }
  });

  const productos = productosRaw.map((p) => ({
    ...p,
    precioEfectivo: Number(p.precioEfectivo), // Convertimos Decimal a Number
    precioDigital: Number(p.precioDigital),   // Convertimos Decimal a Number
  }));

  return (
    <PosShell 
      productos={productos} 
      sucursalId="sucursal-principal" 
      usuarioId="usuario-admin"
    />
  );
}