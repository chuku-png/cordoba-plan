'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Modal from '@/components/Modal'
import ConfirmEliminar from '@/components/ConfirmEliminar'
import Tabla from '@/components/Tabla'

interface Cliente {
  id: number
  nombre: string
  telefono: string | null
  email: string | null
  total_obras: number
  obras_activas: number
  created_at: string
}

interface FormData {
  nombre: string
  telefono: string
  email: string
}

const FORM_VACIO: FormData = { nombre: '', telefono: '', email: '' }

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [eliminando, setEliminando] = useState<Cliente | null>(null)
  const [form, setForm] = useState<FormData>(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [cargandoEliminar, setCargandoEliminar] = useState(false)
  const [error, setError] = useState('')

  const cargar = async () => {
    const res = await fetch('/api/clientes')
    setClientes(await res.json())
  }

  useEffect(() => { cargar() }, [])

  const abrirNuevo = () => {
    setEditando(null)
    setForm(FORM_VACIO)
    setError('')
    setModalAbierto(true)
  }

  const abrirEditar = (c: Cliente) => {
    setEditando(c)
    setForm({ nombre: c.nombre, telefono: c.telefono ?? '', email: c.email ?? '' })
    setError('')
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setEditando(null)
    setError('')
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    setGuardando(true)
    setError('')

    const url = editando ? `/api/clientes/${editando.id}` : '/api/clientes'
    const method = editando ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      await cargar()
      cerrarModal()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Error al guardar')
    }
    setGuardando(false)
  }

  const confirmarEliminar = async () => {
    if (!eliminando) return
    setCargandoEliminar(true)
    await fetch(`/api/clientes/${eliminando.id}`, { method: 'DELETE' })
    await cargar()
    setEliminando(null)
    setCargandoEliminar(false)
  }

  const filtrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.telefono ?? '').includes(busqueda) ||
    (c.email ?? '').toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{clientes.length} clientes en total</p>
        <button
          onClick={abrirNuevo}
          className="px-4 py-2 bg-[#1a1a2e] text-white text-sm rounded-lg hover:bg-[#2a2a4e] transition-colors"
        >
          + Nuevo cliente
        </button>
      </div>

      {/* Buscador */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o email..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full max-w-sm px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20"
        />
      </div>

      {/* Tabla */}
      <Tabla
        datos={filtrados}
        vacio="No hay clientes. Creá el primero con el botón de arriba."
        columnas={[
          {
            header: 'Nombre',
            render: (c) => (
              <Link
                href={`/clientes/${c.id}`}
                className="font-medium text-[#1a1a2e] hover:underline"
              >
                {c.nombre}
              </Link>
            ),
          },
          { header: 'Teléfono', render: (c) => c.telefono ?? '—' },
          { header: 'Email', render: (c) => c.email ?? '—' },
          {
            header: 'Obras',
            render: (c) => (
              <span>
                {c.obras_activas > 0 ? (
                  <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                    {c.obras_activas} activa{c.obras_activas !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">Sin obras activas</span>
                )}
              </span>
            ),
          },
          {
            header: '',
            className: 'w-28 text-right',
            render: (c) => (
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => abrirEditar(c)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => setEliminando(c)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Eliminar
                </button>
              </div>
            ),
          },
        ]}
      />

      {/* Modal nuevo/editar */}
      {modalAbierto && (
        <Modal
          titulo={editando ? 'Editar cliente' : 'Nuevo cliente'}
          onClose={cerrarModal}
        >
          <form onSubmit={guardar} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20"
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="text"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20"
                placeholder="351-555-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20"
                placeholder="correo@ejemplo.com"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={cerrarModal}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="px-4 py-2 text-sm bg-[#1a1a2e] text-white rounded-lg hover:bg-[#2a2a4e] disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear cliente'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal confirmar eliminar */}
      {eliminando && (
        <ConfirmEliminar
          mensaje={`¿Mover a la papelera a "${eliminando.nombre}"? Podés restaurarlo desde Papelera.`}
          onConfirmar={confirmarEliminar}
          onCancelar={() => setEliminando(null)}
          cargando={cargandoEliminar}
        />
      )}
    </div>
  )
}
