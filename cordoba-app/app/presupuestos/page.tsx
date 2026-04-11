'use client'

import { useEffect, useState, useCallback } from 'react'
import Modal from '@/components/Modal'
import ConfirmEliminar from '@/components/ConfirmEliminar'
import SubirArchivo from '@/components/SubirArchivo'
import type { ResumenPresupuesto } from '@/lib/ia'

interface Presupuesto {
  id: number
  obra_id: number | null
  obra_nombre: string | null
  cliente_id: number | null
  cliente_nombre: string | null
  monto: number
  estado: string
  fecha_envio: string | null
  archivo_path: string | null
  notas: string | null
}

interface Obra { id: number; nombre: string; cliente_id: number }
interface Cliente { id: number; nombre: string }

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const ESTADOS = [
  { value: 'sin_respuesta', label: 'Sin respuesta', color: 'bg-gray-100 text-gray-600' },
  { value: 'enviado',       label: 'Enviado',        color: 'bg-blue-100 text-blue-700' },
  { value: 'aceptado',      label: 'Aceptado',       color: 'bg-green-100 text-green-700' },
  { value: 'rechazado',     label: 'Rechazado',      color: 'bg-red-100 text-red-700' },
]

const estadoInfo = (estado: string) =>
  ESTADOS.find(e => e.value === estado) ?? { value: estado, label: estado, color: 'bg-gray-100 text-gray-600' }

export default function PresupuestosPage() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [formCliente, setFormCliente] = useState('')
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroBuscar, setFiltroBuscar] = useState('')

  // Modales
  const [modalNuevo, setModalNuevo] = useState(false)
  const [modalEditar, setModalEditar] = useState<Presupuesto | null>(null)
  const [modalIA, setModalIA] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<Presupuesto | null>(null)

  // Form
  const [form, setForm] = useState({
    obra_id: '',
    monto: '',
    fecha_envio: new Date().toISOString().slice(0, 10),
    estado: 'sin_respuesta',
    archivo_path: '',
    notas: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtroEstado) params.set('estado', filtroEstado)
    const res = await fetch(`/api/presupuestos?${params}`)
    const data = await res.json()
    setPresupuestos(data)
    setLoading(false)
  }, [filtroEstado])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    Promise.all([
      fetch('/api/obras').then(r => r.json()),
      fetch('/api/clientes').then(r => r.json()),
    ]).then(([o, c]) => { setObras(o); setClientes(c) })
  }, [])

  const abrirNuevo = () => {
    setForm({
      obra_id: '',
      monto: '',
      fecha_envio: new Date().toISOString().slice(0, 10),
      estado: 'sin_respuesta',
      archivo_path: '',
      notas: '',
    })
    setFormCliente('')
    setError('')
    setModalNuevo(true)
  }

  const abrirEditar = (p: Presupuesto) => {
    const obraDelCliente = p.obra_id ? obras.find(o => o.id === p.obra_id) : null
    setFormCliente(obraDelCliente ? String(obraDelCliente.cliente_id) : '')
    setForm({
      obra_id: p.obra_id ? String(p.obra_id) : '',
      monto: String(p.monto),
      fecha_envio: p.fecha_envio ?? '',
      estado: p.estado,
      archivo_path: p.archivo_path ?? '',
      notas: p.notas ?? '',
    })
    setError('')
    setModalEditar(p)
  }

  const onResultadoIA = (resultado: { tipo: string; archivo: string; resumen: ResumenPresupuesto }) => {
    const r = resultado.resumen
    setForm(f => ({
      ...f,
      monto: String(r.total ?? 0),
      fecha_envio: r.fecha ?? new Date().toISOString().slice(0, 10),
      notas: [r.descripcion_general, r.notas].filter(Boolean).join(' | ') || '',
    }))
    setError('')
    setModalIA(false)
    setModalNuevo(true)
  }

  const guardar = async () => {
    setError('')
    if (!form.monto) {
      setError('El monto es obligatorio.')
      return
    }
    setGuardando(true)
    try {
      const body = {
        obra_id: form.obra_id ? Number(form.obra_id) : null,
        monto: Number(form.monto),
        fecha_envio: form.fecha_envio || null,
        estado: form.estado,
        archivo_path: form.archivo_path.trim() || null,
        notas: form.notas.trim() || null,
      }
      if (modalEditar) {
        await fetch(`/api/presupuestos/${modalEditar.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        setModalEditar(null)
      } else {
        await fetch('/api/presupuestos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        setModalNuevo(false)
      }
      await cargar()
    } catch {
      setError('Error al guardar.')
    } finally {
      setGuardando(false)
    }
  }

  const cambiarEstado = async (p: Presupuesto, nuevoEstado: string) => {
    await fetch(`/api/presupuestos/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    await cargar()
  }

  const eliminar = async () => {
    if (!confirmEliminar) return
    await fetch(`/api/presupuestos/${confirmEliminar.id}`, { method: 'DELETE' })
    setConfirmEliminar(null)
    await cargar()
  }

  const lista = presupuestos.filter(p => {
    if (!filtroBuscar) return true
    const q = filtroBuscar.toLowerCase()
    return (
      (p.obra_nombre ?? '').toLowerCase().includes(q) ||
      (p.cliente_nombre ?? '').toLowerCase().includes(q) ||
      (p.notas ?? '').toLowerCase().includes(q)
    )
  })

  const totalMonto = presupuestos.reduce((s, p) => s + p.monto, 0)
  const countAceptados  = presupuestos.filter(p => p.estado === 'aceptado').length
  const countPendientes = presupuestos.filter(p => p.estado === 'sin_respuesta' || p.estado === 'enviado').length
  const montoAceptados  = presupuestos.filter(p => p.estado === 'aceptado').reduce((s, p) => s + p.monto, 0)

  const obrasFiltradas = obras.filter(o => !formCliente || o.cliente_id === Number(formCliente))

  const formPresupuestoJSX = (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Cliente</label>
          <select className="input" value={formCliente} onChange={e => { setFormCliente(e.target.value); setForm(f => ({ ...f, obra_id: '' })) }}>
            <option value="">Todos los clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Obra</label>
          <select className="input" value={form.obra_id} onChange={e => setForm(f => ({ ...f, obra_id: e.target.value }))}>
            <option value="">Sin obra</option>
            {obrasFiltradas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Monto *</label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={form.monto}
            onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Fecha de envío</label>
          <input
            className="input"
            type="date"
            value={form.fecha_envio}
            onChange={e => setForm(f => ({ ...f, fecha_envio: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Estado</label>
          <select className="input" value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
            {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Ruta / link del archivo (Drive)</label>
        <input
          className="input"
          value={form.archivo_path}
          onChange={e => setForm(f => ({ ...f, archivo_path: e.target.value }))}
          placeholder="Ej: https://drive.google.com/file/d/..."
        />
      </div>
      <div>
        <label className="label">Notas / descripción</label>
        <textarea
          className="input"
          rows={3}
          value={form.notas}
          onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
          placeholder="Condiciones, descripción del trabajo..."
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
          onClick={() => { setModalNuevo(false); setModalEditar(null) }}
        >
          Cancelar
        </button>
        <button
          className="px-4 py-2 text-sm rounded-lg bg-[#1a1a2e] text-white hover:bg-[#16213e] disabled:opacity-50"
          onClick={guardar}
          disabled={guardando}
        >
          {guardando ? 'Guardando...' : (modalEditar ? 'Guardar cambios' : 'Crear presupuesto')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Presupuestos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de presupuestos enviados a clientes</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModalIA(true)}
            className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            Procesar PDF con IA
          </button>
          <button
            onClick={abrirNuevo}
            className="px-4 py-2 text-sm bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nuevo presupuesto
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{presupuestos.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Monto total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalMonto)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Aceptados</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{countAceptados} <span className="text-sm font-normal text-gray-500">({fmt(montoAceptados)})</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">En espera</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{countPendientes}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <label className="label">Buscar</label>
          <input
            className="input"
            placeholder="Obra, cliente o notas..."
            value={filtroBuscar}
            onChange={e => setFiltroBuscar(e.target.value)}
          />
        </div>
        <div className="min-w-[160px]">
          <label className="label">Estado</label>
          <select className="input" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : lista.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay presupuestos registrados.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Obra</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Notas</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha envío</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Monto</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Archivo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map(p => {
                const ei = estadoInfo(p.estado)
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.obra_nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{p.cliente_nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{p.notas ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.fecha_envio ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(p.monto)}</td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={p.estado}
                        onChange={e => cambiarEstado(p, e.target.value)}
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none ${ei.color}`}
                      >
                        {ESTADOS.map(e => (
                          <option key={e.value} value={e.value}>{e.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.archivo_path ? (
                        <a href={p.archivo_path} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => abrirEditar(p)} className="p-1 text-gray-400 hover:text-gray-700 rounded">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setConfirmEliminar(p)} className="p-1 text-gray-400 hover:text-red-600 rounded">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nuevo */}
      {modalNuevo && (
        <Modal titulo="Nuevo presupuesto" onClose={() => setModalNuevo(false)} ancho="max-w-xl">
          {formPresupuestoJSX}
        </Modal>
      )}

      {/* Modal Editar */}
      {modalEditar && (
        <Modal titulo="Editar presupuesto" onClose={() => setModalEditar(null)} ancho="max-w-xl">
          {formPresupuestoJSX}
        </Modal>
      )}

      {/* Modal IA */}
      {modalIA && (
        <Modal titulo="Procesar presupuesto PDF con IA" onClose={() => setModalIA(false)} ancho="max-w-xl">
          <p className="text-sm text-gray-500 mb-4">Subí un PDF de presupuesto. La IA extraerá los datos y pre-rellenará el formulario.</p>
          <SubirArchivo
            onResultado={r => {
              if (r.tipo === 'presupuesto') onResultadoIA(r as { tipo: string; archivo: string; resumen: ResumenPresupuesto })
            }}
          />
        </Modal>
      )}

      {/* ConfirmEliminar */}
      {confirmEliminar && (
        <ConfirmEliminar
          mensaje={`¿Eliminar este presupuesto de ${fmt(confirmEliminar.monto)}?`}
          onConfirmar={eliminar}
          onCancelar={() => setConfirmEliminar(null)}
        />
      )}
    </div>
  )
}
