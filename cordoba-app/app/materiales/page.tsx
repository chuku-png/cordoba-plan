'use client'

import { useEffect, useState, useCallback } from 'react'
import Modal from '@/components/Modal'
import ConfirmEliminar from '@/components/ConfirmEliminar'
import SubirArchivo from '@/components/SubirArchivo'
import type { ResumenMateriales } from '@/lib/ia'

interface Compra {
  id: number
  proveedor_id: number
  proveedor_nombre: string
  obra_id: number | null
  obra_nombre: string | null
  descripcion: string
  monto_total: number
  estado_pago: string
  fecha: string
  archivo_path: string | null
  resumen_json: string | null
  total_pagado: number
}

interface Proveedor { id: number; nombre: string }
interface Obra { id: number; nombre: string; cliente_id: number }
interface Cliente { id: number; nombre: string }

interface ResumenItem {
  descripcion: string
  cantidad?: number | string
  precio_unitario?: number
  total: number
  estado?: string
}

interface ResumenJson {
  items?: ResumenItem[]
  total_general?: number
  notas?: string
}

function parseResumen(raw: string | null): ResumenJson | null {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const estadoPagoLabel: Record<string, string> = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  pagado: 'Pagado',
}

const estadoPagoColor: Record<string, string> = {
  pendiente: 'bg-red-100 text-red-700',
  parcial: 'bg-yellow-100 text-yellow-700',
  pagado: 'bg-green-100 text-green-700',
}

export default function MaterialesPage() {
  const [compras, setCompras] = useState<Compra[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [formCliente, setFormCliente] = useState('')
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroObra, setFiltroObra] = useState('')

  // Leer obra_id de la URL al montar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const obraId = params.get('obra_id')
    if (obraId) setFiltroObra(obraId)
  }, [])
  const [filtroEstado, setFiltroEstado] = useState('')

  // Modales
  const [modalNueva, setModalNueva] = useState(false)
  const [modalEditar, setModalEditar] = useState<Compra | null>(null)
  const [modalResumen, setModalResumen] = useState<Compra | null>(null)
  const [modalIA, setModalIA] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<Compra | null>(null)

  // Form nueva/editar compra
  const [form, setForm] = useState({
    proveedor_id: '',
    obra_id: '',
    descripcion: '',
    monto_total: '',
    fecha: new Date().toISOString().slice(0, 10),
    archivo_path: '',
    resumen_json: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    const url = filtroObra ? `/api/materiales?obra_id=${filtroObra}` : '/api/materiales'
    const res = await fetch(url)
    const data = await res.json()
    setCompras(data)
    setLoading(false)
  }, [filtroObra])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    Promise.all([
      fetch('/api/obras').then(r => r.json()),
      fetch('/api/proveedores').then(r => r.json()),
      fetch('/api/clientes').then(r => r.json()),
    ]).then(([o, p, c]) => { setObras(o); setProveedores(p); setClientes(c) })
  }, [])

  const abrirNueva = () => {
    setForm({
      proveedor_id: '',
      obra_id: '',
      descripcion: '',
      monto_total: '',
      fecha: new Date().toISOString().slice(0, 10),
      archivo_path: '',
      resumen_json: '',
    })
    setFormCliente('')
    setError('')
    setModalNueva(true)
  }

  // Cuando el usuario confirma el resultado de la IA, pre-rellena el form
  const onResultadoIA = (resultado: { tipo: string; archivo: string; resumen: ResumenMateriales }) => {
    const r = resultado.resumen
    setForm({
      proveedor_id: '',
      obra_id: '',
      descripcion: resultado.archivo.replace(/\.\w+$/, ''),
      monto_total: String(r.total_general ?? 0),
      fecha: r.fecha ?? new Date().toISOString().slice(0, 10),
      archivo_path: '',
      resumen_json: JSON.stringify(r, null, 2),
    })
    setError('')
    setModalIA(false)
    setModalNueva(true)
  }

  const abrirEditar = (c: Compra) => {
    const obraDelCliente = c.obra_id ? obras.find(o => o.id === c.obra_id) : null
    setFormCliente(obraDelCliente ? String(obraDelCliente.cliente_id) : '')
    setForm({
      proveedor_id: String(c.proveedor_id),
      obra_id: c.obra_id ? String(c.obra_id) : '',
      descripcion: c.descripcion,
      monto_total: String(c.monto_total),
      fecha: c.fecha,
      archivo_path: c.archivo_path || '',
      resumen_json: c.resumen_json || '',
    })
    setError('')
    setModalEditar(c)
  }

  const guardar = async () => {
    setError('')
    if (!form.proveedor_id || !form.descripcion.trim() || !form.monto_total || !form.fecha) {
      setError('Proveedor, descripción, monto y fecha son obligatorios.')
      return
    }
    setGuardando(true)
    try {
      const body = {
        proveedor_id: Number(form.proveedor_id),
        obra_id: form.obra_id ? Number(form.obra_id) : null,
        descripcion: form.descripcion.trim(),
        monto_total: Number(form.monto_total),
        fecha: form.fecha,
        archivo_path: form.archivo_path.trim() || null,
        resumen_json: form.resumen_json.trim() || null,
      }
      if (modalEditar) {
        // Actualizar compra existente via compras-proveedor
        await fetch(`/api/compras-proveedor/${modalEditar.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        setModalEditar(null)
      } else {
        await fetch('/api/materiales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        setModalNueva(false)
      }
      await cargar()
    } catch {
      setError('Error al guardar.')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async () => {
    if (!confirmEliminar) return
    await fetch(`/api/compras-proveedor/${confirmEliminar.id}`, { method: 'DELETE' })
    setConfirmEliminar(null)
    await cargar()
  }

  const comprasFiltradas = compras.filter(c => {
    if (filtroEstado && c.estado_pago !== filtroEstado) return false
    return true
  })

  const totalMonto = comprasFiltradas.reduce((s, c) => s + c.monto_total, 0)
  const totalPagado = comprasFiltradas.reduce((s, c) => s + c.total_pagado, 0)
  const totalPendiente = totalMonto - totalPagado

  const obrasFiltradas = obras.filter(o => !formCliente || o.cliente_id === Number(formCliente))
  const formCompraJSX = (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Proveedor *</label>
          <select className="input" value={form.proveedor_id} onChange={e => setForm(f => ({ ...f, proveedor_id: e.target.value }))}>
            <option value="">Seleccionar...</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Cliente</label>
          <select className="input" value={formCliente} onChange={e => { setFormCliente(e.target.value); setForm(f => ({ ...f, obra_id: '' })) }}>
            <option value="">Todos los clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Obra</label>
        <select className="input" value={form.obra_id} onChange={e => setForm(f => ({ ...f, obra_id: e.target.value }))}>
          <option value="">Sin obra</option>
          {obrasFiltradas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Descripción *</label>
        <input className="input" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Materiales de construcción" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Monto total *</label>
          <input className="input" type="number" min="0" step="0.01" value={form.monto_total} onChange={e => setForm(f => ({ ...f, monto_total: e.target.value }))} />
        </div>
        <div>
          <label className="label">Fecha *</label>
          <input className="input" type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="label">Ruta / link del archivo (Drive)</label>
        <input className="input" value={form.archivo_path} onChange={e => setForm(f => ({ ...f, archivo_path: e.target.value }))} placeholder="Ej: https://drive.google.com/file/d/..." />
      </div>
      <div>
        <label className="label">Resumen JSON (opcional)</label>
        <textarea
          className="input font-mono text-xs"
          rows={4}
          value={form.resumen_json}
          onChange={e => setForm(f => ({ ...f, resumen_json: e.target.value }))}
          placeholder={'{\n  "items": [],\n  "total_general": 0\n}'}
        />
        <p className="text-xs text-gray-400 mt-1">Este campo se llenará automáticamente al procesar un archivo con IA.</p>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50" onClick={() => { setModalNueva(false); setModalEditar(null) }}>Cancelar</button>
        <button className="px-4 py-2 text-sm rounded-lg bg-[#1a1a2e] text-white hover:bg-[#16213e] disabled:opacity-50" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : (modalEditar ? 'Guardar cambios' : 'Registrar compra')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Materiales</h1>
          <p className="text-sm text-gray-500 mt-0.5">Compras con archivos y resúmenes de materiales</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModalIA(true)}
            className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            Procesar con IA
          </button>
          <button
            onClick={abrirNueva}
            className="px-4 py-2 text-sm bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nueva compra
          </button>
        </div>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total compras</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalMonto)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total pagado</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{fmt(totalPagado)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total pendiente</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{fmt(totalPendiente)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <label className="label">Filtrar por obra</label>
          <select className="input" value={filtroObra} onChange={e => setFiltroObra(e.target.value)}>
            <option value="">Todas las obras</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="label">Estado de pago</label>
          <select className="input" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="pagado">Pagado</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : comprasFiltradas.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay compras con archivos registradas.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Obra</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Monto</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Pagado</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Archivo</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Resumen</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {comprasFiltradas.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.proveedor_nombre}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{c.descripcion}</td>
                  <td className="px-4 py-3 text-gray-500">{c.obra_nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{c.fecha}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(c.monto_total)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{fmt(c.total_pagado)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoPagoColor[c.estado_pago] ?? 'bg-gray-100 text-gray-600'}`}>
                      {estadoPagoLabel[c.estado_pago] ?? c.estado_pago}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.archivo_path ? (
                      <a href={c.archivo_path} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.resumen_json ? (
                      <button onClick={() => setModalResumen(c)} className="text-[#1a1a2e] hover:text-[#16213e]">
                        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      </button>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => abrirEditar(c)} className="p-1 text-gray-400 hover:text-gray-700 rounded">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setConfirmEliminar(c)} className="p-1 text-gray-400 hover:text-red-600 rounded">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nueva compra */}
      {modalNueva && (
        <Modal titulo="Nueva compra con archivo" onClose={() => setModalNueva(false)} ancho="max-w-xl">
          {formCompraJSX}
        </Modal>
      )}

      {/* Modal Editar compra */}
      {modalEditar && (
        <Modal titulo="Editar compra" onClose={() => setModalEditar(null)} ancho="max-w-xl">
          {formCompraJSX}
        </Modal>
      )}

      {/* Modal Resumen JSON */}
      {modalResumen && (() => {
        const resumen = parseResumen(modalResumen.resumen_json)
        return (
          <Modal titulo={`Resumen — ${modalResumen.descripcion}`} onClose={() => setModalResumen(null)} ancho="max-w-2xl">
            {resumen ? (
              <div className="space-y-4">
                {resumen.items && resumen.items.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Items</h3>
                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-gray-600">Descripción</th>
                          <th className="text-right px-3 py-2 text-gray-600">Cantidad</th>
                          <th className="text-right px-3 py-2 text-gray-600">P. Unit.</th>
                          <th className="text-right px-3 py-2 text-gray-600">Total</th>
                          <th className="text-center px-3 py-2 text-gray-600">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {resumen.items.map((item, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2">{item.descripcion}</td>
                            <td className="px-3 py-2 text-right">{item.cantidad ?? '—'}</td>
                            <td className="px-3 py-2 text-right">{item.precio_unitario != null ? fmt(item.precio_unitario) : '—'}</td>
                            <td className="px-3 py-2 text-right font-medium">{fmt(item.total)}</td>
                            <td className="px-3 py-2 text-center">
                              {item.estado ? (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  item.estado === 'pagado' ? 'bg-green-100 text-green-700' :
                                  item.estado === 'pendiente' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>{item.estado}</span>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {resumen.total_general != null && (
                  <div className="flex justify-end">
                    <p className="text-sm font-semibold text-gray-900">Total general: {fmt(resumen.total_general)}</p>
                  </div>
                )}
                {resumen.notas && (
                  <div className="text-sm text-gray-600 bg-gray-50 rounded p-3">
                    <strong>Notas:</strong> {resumen.notas}
                  </div>
                )}
              </div>
            ) : (
              <pre className="text-xs bg-gray-50 rounded p-3 overflow-auto max-h-96">{modalResumen.resumen_json}</pre>
            )}
          </Modal>
        )
      })()}

      {/* Modal IA */}
      {modalIA && (
        <Modal titulo="Procesar planilla de materiales con IA" onClose={() => setModalIA(false)} ancho="max-w-xl">
          <p className="text-sm text-gray-500 mb-4">Subí un archivo Excel con la lista de materiales. La IA extraerá los datos y pre-rellenará el formulario.</p>
          <SubirArchivo
            onResultado={r => {
              if (r.tipo === 'materiales') onResultadoIA(r as { tipo: string; archivo: string; resumen: ResumenMateriales })
            }}
          />
        </Modal>
      )}

      {/* ConfirmEliminar */}
      {confirmEliminar && (
        <ConfirmEliminar
          mensaje={`¿Eliminar la compra "${confirmEliminar.descripcion}" de ${confirmEliminar.proveedor_nombre}?`}
          onConfirmar={eliminar}
          onCancelar={() => setConfirmEliminar(null)}
        />
      )}
    </div>
  )
}
