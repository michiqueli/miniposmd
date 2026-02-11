import DeviceManager from "@/components/admin/deviceManager/DeviceManager";
import { requireRole } from '@/lib/auth';
import AdminNav from '@/components/admin/AdminNav';

export default async function DeviceManagerPage() {
  await requireRole(['ADMIN']);

  return (
    <div className="p-6">
      <AdminNav />
      <h1 className="text-2xl font-bold mb-4">Administración de Terminales</h1>
      <DeviceManager />
    </div>
  );
}
