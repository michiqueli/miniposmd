'use client'

import { useState, useEffect } from 'react'
import { getTerminalesMP, getSucursales, vincularTerminal } from '@/app/actions/mercadopago'

export default function TerminalManager() {
  const [devices, setDevices] = useState<any[]>([])
  const [sucursales, setSucursales] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [statusStep, setStatusStep] = useState<string | null>(null);

  // Estado para controlar qué terminal se está vinculando ahora mismo
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [selectedSucursal, setSelectedSucursal] = useState<string>("")

  // Cargar sucursales al montar el componente (para tenerlas listas)
  useEffect(() => {
    getSucursales().then(res => {
      if (res.sucursales) setSucursales(res.sucursales);
    });
  }, []);

  const buscarTerminales = async () => {
    setLoading(true);
    setMensaje('');
    const res = await getTerminalesMP();

    if (res.error) {
      setMensaje(`Error: ${res.error}`);
    } else {
      setDevices(res.devices || []);
      if (res.devices && res.devices.length === 0) setMensaje("No se encontraron terminales activas.");
    }
    setLoading(false);
  };

  const handleGuardarVinculo = async () => {
    if (!selectedDevice || !selectedSucursal) return;

    const sucursalId = selectedSucursal;
    const nombreSucursal = sucursales.find(s => s.id === sucursalId)?.nombre;

    if (!window.confirm(`¿Asignar la terminal ${selectedDevice} a ${nombreSucursal}?`)) return;

    setLoading(true);

    // PASO 1
    setStatusStep("1/3 - Configurando terminal en modo PDV...");
    // Podés incluso llamar a las funciones por separado o dejar que vincularTerminal lo haga, 
    // pero si querés feedback preciso, podrías dividir la Action. 
    // Por ahora, usemos el mensaje antes de llamar a la acción:

    const res = await vincularTerminal(selectedDevice, sucursalId);

    if (res.success) {
      setStatusStep("3/3 - ¡Todo listo! Terminal vinculada.");
      setTimeout(() => {
        alert("¡Vinculación completada con éxito!");
        setSelectedDevice(null);
        setSelectedSucursal("");
        setStatusStep(null);
        buscarTerminales(); // Refrescamos la lista para ver el modo nuevo
      }, 500);
    } else {
      alert("Error: " + res.error);
      setStatusStep(null);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-white shadow rounded-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Administración de Terminales MP</h2>

      <button
        onClick={buscarTerminales}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50 mb-6"
      >
        {loading ? 'Buscando...' : 'Actualizar Lista de Terminales'}
      </button>

      {mensaje && <p className="mb-4 text-red-500 font-medium">{mensaje}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {devices.map((dev: any) => (
          <div key={dev.id} className="border p-4 rounded-lg shadow-sm hover:shadow-md transition bg-gray-50 flex flex-col justify-between relative overflow-hidden">

            {/* OVERLAY DE CARGA (Aparece solo cuando esta terminal se está procesando) */}
            {loading && selectedDevice === dev.id && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4 text-center">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-indigo-800 font-black text-xs uppercase tracking-widest animate-pulse">
                  {statusStep || 'Procesando...'}
                </p>
              </div>
            )}

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-3 h-3 rounded-full ${dev.operating_mode === 'PDV' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                <p className="font-bold text-gray-700">{dev.operating_mode}</p>
              </div>
              <p className="text-sm text-gray-600 font-medium">{dev.name || "Sin Nombre"}</p>
              <p className="text-xs text-gray-400 font-mono mt-1 truncate" title={dev.id}>ID: {dev.id}</p>
            </div>

            {/* Zona de Acción */}
            <div className="mt-2 pt-3 border-t border-gray-200">
              {selectedDevice === dev.id ? (
                <div className="flex flex-col gap-2 animate-in fade-in zoom-in duration-200">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Elegir Sucursal:</label>
                  <select
                    disabled={loading}
                    className="border-2 border-gray-100 rounded-xl p-2 text-sm w-full bg-white focus:border-indigo-500 outline-none transition-all"
                    value={selectedSucursal}
                    onChange={(e) => setSelectedSucursal(e.target.value)}
                  >
                    <option value="">-- Seleccionar --</option>
                    {sucursales.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} {s.mpDeviceId ? '⚠️' : ''}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={handleGuardarVinculo}
                      disabled={!selectedSucursal || loading}
                      className="bg-indigo-600 text-white text-xs font-bold px-3 py-2.5 rounded-xl flex-1 hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
                    >
                      CONFIRMAR VÍNCULO
                    </button>
                    <button
                      onClick={() => { setSelectedDevice(null); setStatusStep(null); }}
                      disabled={loading}
                      className="bg-gray-200 text-gray-500 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-gray-300 transition-all"
                    >
                      X
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedDevice(dev.id)}
                  disabled={loading}
                  className="w-full bg-white border-2 border-indigo-600 text-indigo-600 font-bold text-sm px-3 py-2.5 rounded-xl hover:bg-indigo-50 transition-all active:scale-95"
                >
                  VINCULAR A SUCURSAL
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}