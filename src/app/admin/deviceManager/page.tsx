import DeviceManager from "@/components/deviceManager/DeviceManager"; // Ajusta la ruta si es necesario

export default function DeviceManagerPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Administración de Terminales</h1>
      <DeviceManager />
    </div>
  );
}