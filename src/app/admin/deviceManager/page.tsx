import DeviceManager from "@/components/admin/deviceManager/DeviceManager";
import { requireRole } from '@/lib/auth';
import AdminNav from '@/components/admin/AdminNav';

export default async function DeviceManagerPage() {
  await requireRole(['ADMIN']);

  return (
    <div className="p-8 min-h-screen bg-slate-50">
      <AdminNav />
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Gestión de Terminales</h1>
      <DeviceManager />
    </div>
  );
}
