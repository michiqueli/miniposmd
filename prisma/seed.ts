import { db } from "../src/lib/db";

async function main() {
  const sucursal = await db.sucursal.upsert({
    where: { id: "sucursal-principal" },
    update: {},
    create: {
      nombre: "EcoParrilla Central",
      direccion: "Tu direccion aca",
      cuit: "20XXXXXXXXX",
      regimen: "MONO",
      puntoVenta: 1,
    },
  });

  await db.usuario.upsert({
    where: { id: "admin-inicial" },
    update: {},
    create: {
      nombre: "Michi Admin",
      pin: "1234",
      rol: "ADMIN",
      sucursalId: sucursal.id,
    },
  });

  console.log("✅ Seed OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });