'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Modal from '@/components/Modal'
import ConfirmEliminar from '@/components/ConfirmEliminar'

interface Obra {
  id: number
  nombre: string
  estado: 'activa' | 'terminada' | 'cobrada'
  presupuesto_original: number | null
  fecha_inicio: string | null
  fecha_fin: string | null
  total_cobrado: number
  adicionales_pendientes: number
}

interface Cliente {
  id: number
  nombre: string
  telefono: string | null
  email: string | null
  created_at: string
  obras: Obra[]
}

const ESTADO_LABEL: Record<string, { label: string; color: string }> = {
  activa:    { label: 'Activa',    color: 'bg-green-100 text-green-700' },
  terminada: { label: 'Terminada', color: 'bg-yellow-100 text-yellow-700' },
  cobrada:   { label: 'Cobrada',   color: 'bg-blue-100 text-blue-700' },
}

const ESTADOS_OBRA = ['activa', 'terminada', 'cobrada']

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default function FichaClientePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const id = params.id

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [cargando, setCargando] = useState(true)

  // Modal nueva obra
  const [modalObra, setModalObra] = useState(false)
  const [obraEditando, setObraEditando] = useState<Obra | null>(null)
  const [formObra, setFormObra] = useState({ nombre: '', presupuesto_original: '', fecha_inicio: '' })
  const [guardandoObra, setGuardandoObra] = useState(false)
  const [errorObra, setErrorObra] = useState('')

  // Cambio de estado inline
  const [cambiandoEstado, setCambiandoEstado] = useState<number | null>(null)

  // Eliminar obra
  const [eliminandoObra, setEliminandoObra] = useState<Obra | null>(null)
  const [cargandoEliminar, setCargandoEliminar] = useState(false)

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/clientes/${id}`)
    if (res.status === 404) { router.push('/clientes'); return }
    setCliente(await res.json())
    setCargando(false)
  }, [id, router])

  useEffect(() => { cargar() }, [cargar])

  const abrirNuevaObra = () => {
    setObraEditando(null)
    setFormObra({ nombre: '', presupuesto_original: '', fecha_inicio: '' })
    setErrorObra('')
    setModalObra(true)
  }

  const abrirEditarObra = (o: Obra) => {
    setObraEditando(o)
    setFormObra({
      nombre: o.nombre,
      presupuesto_original: o.presupuesto_original?.toString() ?? '',
      fecha_inicio: o.fecha_inicio ?? '',
    })
    setErrorObra('')
    setModalObra(true)
  }

  const guardarObra = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formObra.nombre.trim()) { setErrorObra('El nombre es obligatorio'); return }
    setGuardandoObra(true)
    setErrorObra('')

    let res: Response
    if (obraEditando) {
      res = await fetch(`/api/obras/${obraEditando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formObra.nombre,
          presupuesto_original: formObra.presupuesto_original ? Number(formObra.presupuesto_original) : null,
          fecha_inicio: formObra.fecha_inicio || null,
        }),
      })
    } else {
      res = await fetch('/api/obras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: id,
          nombre: formObra.nombre,
          presupuesto_original: formObra.presupuesto_original ? Number(formObra.presupuesto_original) : null,
          fecha_inicio: formObra.fecha_inicio || null,
        }),
      })
    }

    if (res.ok) {
      await cargar()
      setModalObra(false)
    } else {
      const data = await res.json()
      setErrorObra(data.error ?? 'Error al guardar')
    }
    setGuardandoObra(false)
  }

  const cambiarEstado = async (obraId: number, nuevoEstado: string) => {
    setCambiandoEstado(obraId)
    await fetch(`/api/obras/${obraId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    await cargar()
    setCambiandoEstado(null)
  }

  const confirmarEliminarObra = async () => {
    if (!eliminandoObra) return
    setCargandoEliminar(true)
    await fetch(`/api/obras/${eliminandoObra.id}`, { method: 'DELETE' })
    await cargar()
    setEliminandoObra(null)
    setCargandoEliminar(false)
  }

  if (cargando) {
    return <div className="text-gray-400 text-sm p-6">Cargando...</div>
  }

  if (!cliente) return null

  const totalPresupuestado = cliente.obras.reduce((s, o) => s + (o.presupuesto_original ?? 0), 0)
  const totalCobrado = cliente.obras.reduce((s, o) => s + o.total_cobrado, 0)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500">
        <Link href="/clientes" className="hover:underline">Clientes</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800 font-medium">{cliente.nombre}</span>
      </div>

      {/* Card datos del cliente */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{cliente.nombre}</h2>
            <div className="mt-2 space-y-1 text-sm text-gray-500">
              {cliente.telefono && <p>📞 {cliente.telefono}</p>}
              {cliente.email && <p>✉️ {cliente.email}</p>}
            </div>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-800">{fmt(totalPresupuestado)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Presupuestado</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{fmt(totalCobrado)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Cobrado</p>
            </div>
          </div>
        </div>
      </div>

      {/* Obras */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-700">
            Obras ({cliente.obras.length})
          </h3>
          <button
            onClick={abrirNuevaObra}
            className="px-3 py-1.5 bg-[#1a1a2e] text-white text-xs rounded-lg hover:bg-[#2a2a4e]"
          >
            + Nueva obra
          </button>
        </div>

        {cliente.obras.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
            Este cliente no tiene obras todavía.
          </div>
        ) : (
          <div className="space-y-3">
            {cliente.obras.map((obra) => {
              const est = ESTADO_LABEL[obra.estado]
              const pendiente = (obra.presupuesto_original ?? 0) - obra.total_cobrado
              return (
                <div key={obra.id} className="bg-white rounded-lg border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800">{obra.nombre}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${est.color}`}>
                          {est.label}
                        </span>
                        {obra.adicionales_pendientes > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                            {obra.adicionales_pendientes} adicional{obra.adicionales_pendientes !== 1 ? 'es' : ''} pendiente{obra.adicionales_pendientes !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                        {obra.presupuesto_original && (
                          <span>Presupuesto: <strong className="text-gray-700">{fmt(obra.presupuesto_original)}</strong></span>
                        )}
                        <span>Cobrado: <strong className="text-green-600">{fmt(obra.total_cobrado)}</strong></span>
                        {obra.presupuesto_original && pendiente > 0 && (
                          <span>Pendiente: <strong className="text-orange-500">{fmt(pendiente)}</strong></span>
                        )}
                        {obra.fecha_inicio && (
                          <span>Inicio: {obra.fecha_inicio}</span>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Selector de estado */}
                      <select
                        value={obra.estado}
                        disabled={cambiandoEstado === obra.id}
                        onChange={(e) => cambiarEstado(obra.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#1a1a2e]/20 bg-white"
                      >
                        {ESTADOS_OBRA.map((s) => (
                          <option key={s} value={s}>{ESTADO_LABEL[s].label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => abrirEditarObra(obra)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setEliminandoObra(obra)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal nueva/editar obra */}
      {modalObra && (
        <Modal
          titulo={obraEditando ? 'Editar obra' : 'Nueva obra'}
          onClose={() => setModalObra(false)}
        >
          <form onSubmit={guardarObra} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la obra <span className="text-red-500">*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={formObra.nombre}
                onChange={(e) => setFormObra({ ...formObra, nombre: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20"
                placeholder="Ej: Ampliación cocina"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Presupuesto original ($)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={formObra.presupuesto_original}
                onChange={(e) => setFormObra({ ...formObra, presupuesto_original: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
              <input
                type="date"
                value={formObra.fecha_inicio}
                onChange={(e) => setFormObra({ ...formObra, fecha_inicio: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20"
              />
            </div>

            {errorObra && <p className="text-red-500 text-sm">{errorObra}</p>}

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalObra(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoObra}
                className="px-4 py-2 text-sm bg-[#1a1a2e] text-white rounded-lg hover:bg-[#2a2a4e] disabled:opacity-50"
              >
                {guardandoObra ? 'Guardando...' : obraEditando ? 'Guardar cambios' : 'Crear obra'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmar eliminar obra */}
      {eliminandoObra && (
        <ConfirmEliminar
          mensaje={`¿Mover la obra "${eliminandoObra.nombre}" a la papelera?`}
          onConfirmar={confirmarEliminarObra}
          onCancelar={() => setEliminandoObra(null)}
          cargando={cargandoEliminar}
        />
      )}
    </div>
  )
}
