'use client'

import { useEffect, useState } from 'react'
import { getTerminalesMP, getSucursales, vincularTerminal } from '@/app/actions/mercadopago'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'

type MPDevice = {
  id: string
  operating_mode: string
  name?: string | null
}

type Sucursal = {
  id: string
  nombre: string
  mpDeviceId?: string | null
}

export default function TerminalManager() {
  const [devices, setDevices] = useState<MPDevice[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [selectedSucursal, setSelectedSucursal] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    getSucursales().then((res) => {
      if (res.sucursales) {
        setSucursales(res.sucursales as Sucursal[])
      }
    })
  }, [])

  const buscarTerminales = async () => {
    setLoading(true)
    setMensaje('')
    const res = await getTerminalesMP()

    if (res.error) {
      setMensaje(`Error: ${res.error}`)
    } else {
      setDevices((res.devices || []) as MPDevice[])
      if (res.devices && res.devices.length === 0) {
        setMensaje('No se encontraron terminales activas.')
      }
    }

    setLoading(false)
  }

  const handleGuardarVinculo = async () => {
    if (!selectedDevice || !selectedSucursal) return

    const res = await vincularTerminal(selectedDevice, selectedSucursal)

    if (res.success) {
      showToast('¡Vinculación guardada!', 'success')
      setSelectedDevice(null)
      setSelectedSucursal('')
      setShowConfirm(false)
    } else {
      showToast('Error al guardar la vinculación.', 'error')
      setShowConfirm(false)
    }
  }

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
        {devices.map((dev) => (
          <div key={dev.id} className="border p-4 rounded-lg shadow-sm hover:shadow-md transition bg-gray-50 flex flex-col justify-between">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-3 h-3 rounded-full ${dev.operating_mode === 'PDV' ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                <p className="font-bold text-gray-700">{dev.operating_mode}</p>
              </div>
              <p className="text-sm text-gray-600 font-medium">{dev.name || 'Sin Nombre'}</p>
              <p className="text-xs text-gray-400 font-mono mt-1 truncate" title={dev.id}>ID: {dev.id}</p>
            </div>

            <div className="mt-2 pt-3 border-t border-gray-200">
              {selectedDevice === dev.id ? (
                <div className="flex flex-col gap-2 animate-in fade-in zoom-in duration-200">
                  <label className="text-xs font-bold text-gray-600">Elegir Sucursal:</label>
                  <select
                    className="border rounded p-1 text-sm w-full bg-white"
                    value={selectedSucursal}
                    onChange={(e) => setSelectedSucursal(e.target.value)}
                  >
                    <option value="">-- Seleccionar --</option>
                    {sucursales.map((sucursal) => (
                      <option key={sucursal.id} value={sucursal.id}>
                        {sucursal.nombre} {sucursal.mpDeviceId ? '(Ya tiene terminal)' : ''}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => setShowConfirm(true)}
                      disabled={!selectedSucursal}
                      className="bg-green-600 text-white text-xs px-3 py-1.5 rounded flex-1 hover:bg-green-700 disabled:opacity-50"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setSelectedDevice(null)}
                      className="bg-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded hover:bg-gray-400"
                    >
                      X
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedDevice(dev.id)}
                  className="w-full bg-indigo-600 text-white text-sm px-3 py-2 rounded hover:bg-indigo-700 transition"
                >
                  Vincular a Sucursal
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Confirmar vinculación"
        description={`¿Asignar la terminal ${selectedDevice ?? ''} a ${sucursales.find((sucursal) => sucursal.id === selectedSucursal)?.nombre ?? 'la sucursal seleccionada'}?`}
        confirmLabel="Sí, vincular"
        onClose={() => setShowConfirm(false)}
        onConfirm={handleGuardarVinculo}
      />
    </div>
  )
}
