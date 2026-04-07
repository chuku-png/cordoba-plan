'use client'

import { useEffect, useState, useCallback } from 'react'
import Modal from '@/components/Modal'
import ConfirmEliminar from '@/components/ConfirmEliminar'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Proveedor {
  id: number
  nombre: string
  telefono: string | null
  condicion_pago: string | null
  total_compras: number
  total_pagado: number
  deuda_actual: number
  cantidad_compras: number
}

interface Compra {
  id: number
  proveedor_id: number
  obra_id: number | null
  descripcion: string
  monto_total: number
  estado_pago: 'pendiente' | 'pagado'
  fecha: string
  archivo_path: string | null
  obra_nombre: string | null
  total_pagado_compra: number
}

interface Pago {
  id: number
  proveedor_id: number
  compra_id: number | null
  monto: number
  fecha: string
  observaciones: string | null
  compra_descripcion: string | null
}

interface Obra { id: number; nombre: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const CONDICIONES = ['contado', '30_dias', '60_dias', 'cuenta_corriente']
const LABEL_COND: Record<string, string> = {
  contado: 'Contado', '30_dias': '30 días', '60_dias': '60 días', cuenta_corriente: 'Cta. cte.',
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [obras, setObras] = useState<Obra[]>([])

  // Panel de ficha (null = lista, number = id del proveedor abierto)
  const [fichaId, setFichaId] = useState<number | null>(null)
  const [compras, setCompras] = useState<Compra[]>([])
  const [pagos,   setPagos]   = useState<Pago[]>([])

  // ── Modales proveedor
  const [modalProv, setModalProv] = useState(false)
  const [editProv,  setEditProv]  = useState<Proveedor | null>(null)
  const [formProv, setFormProv] = useState({ nombre: '', telefono: '', condicion_pago: 'contado' })

  // ── Modal compra
  const [modalCompra, setModalCompra] = useState(false)
  const [editCompra,  setEditCompra]  = useState<Compra | null>(null)
  const [formCompra, setFormCompra] = useState({
    obra_id: '', descripcion: '', monto_total: '',
    estado_pago: 'pendiente', fecha: new Date().toISOString().slice(0, 10),
  })

  // ── Modal pago
  const [modalPago, setModalPago] = useState(false)
  const [formPago, setFormPago] = useState({
    compra_id: '', monto: '', fecha: new Date().toISOString().slice(0, 10), observaciones: '',
  })

  // ── Eliminar
  const [eliminando, setEliminando] = useState<{ tipo: string; id: number; label: string } | null>(null)
  const [cargandoEliminar, setCargandoEliminar] = useState(false)

  const [guardando, setGuardando] = useState(false)
  const [error, setError]   = useState('')

  // ── Carga ─────────────────────────────────────────────────────────────────
  const cargarProveedores = useCallback(async () => {
    const res = await fetch('/api/proveedores')
    setProveedores(await res.json())
  }, [])

  const cargarFicha = useCallback(async (id: number) => {
    const [rc, rp] = await Promise.all([
      fetch(`/api/compras-proveedor?proveedor_id=${id}`),
      fetch(`/api/pagos-proveedor?proveedor_id=${id}`),
    ])
    setCompras(await rc.json())
    setPagos(await rp.json())
  }, [])

  useEffect(() => { cargarProveedores() }, [cargarProveedores])
  useEffect(() => { fetch('/api/obras').then(r => r.json()).then(setObras) }, [])
  useEffect(() => { if (fichaId) cargarFicha(fichaId) }, [fichaId, cargarFicha])

  const provActual = proveedores.find(p => p.id === fichaId)

  // ── Abrir ficha ───────────────────────────────────────────────────────────
  const abrirFicha = (id: number) => { setFichaId(id) }
  const cerrarFicha = () => { setFichaId(null); setCompras([]); setPagos([]) }

  // ── Modal proveedor ───────────────────────────────────────────────────────
  const abrirProv = (p?: Proveedor) => {
    setEditProv(p ?? null)
    setFormProv(p
      ? { nombre: p.nombre, telefono: p.telefono ?? '', condicion_pago: p.condicion_pago ?? 'contado' }
      : { nombre: '', telefono: '', condicion_pago: 'contado' })
    setError(''); setModalProv(true)
  }

  const guardarProv = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formProv.nombre.trim()) { setError('El nombre es obligatorio'); return }
    setGuardando(true); setError('')
    const url    = editProv ? `/api/proveedores/${editProv.id}` : '/api/proveedores'
    const method = editProv ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formProv),
    })
    if (res.ok) { await cargarProveedores(); setModalProv(false) }
    else { const d = await res.json(); setError(d.error ?? 'Error') }
    setGuardando(false)
  }

  // ── Modal compra ──────────────────────────────────────────────────────────
  const abrirCompra = (c?: Compra) => {
    setEditCompra(c ?? null)
    setFormCompra(c
      ? { obra_id: c.obra_id?.toString() ?? '', descripcion: c.descripcion,
          monto_total: String(c.monto_total), estado_pago: c.estado_pago,
          fecha: c.fecha }
      : { obra_id: '', descripcion: '', monto_total: '',
          estado_pago: 'pendiente', fecha: new Date().toISOString().slice(0, 10) })
    setError(''); setModalCompra(true)
  }

  const guardarCompra = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formCompra.descripcion.trim() || !formCompra.monto_total || !formCompra.fecha) {
      setError('Descripción, monto y fecha son obligatorios'); return
    }
    setGuardando(true); setError('')
    let res: Response
    if (editCompra) {
      res = await fetch(`/api/compras-proveedor/${editCompra.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formCompra,
          obra_id: formCompra.obra_id ? Number(formCompra.obra_id) : null,
          monto_total: Number(formCompra.monto_total),
        }),
      })
    } else {
      res = await fetch('/api/compras-proveedor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proveedor_id: fichaId,
          obra_id: formCompra.obra_id ? Number(formCompra.obra_id) : null,
          descripcion: formCompra.descripcion,
          monto_total: Number(formCompra.monto_total),
          estado_pago: formCompra.estado_pago,
          fecha: formCompra.fecha,
        }),
      })
    }
    if (res.ok) {
      await Promise.all([cargarFicha(fichaId!), cargarProveedores()])
      setModalCompra(false)
    } else { const d = await res.json(); setError(d.error ?? 'Error') }
    setGuardando(false)
  }

  // ── Modal pago ────────────────────────────────────────────────────────────
  const abrirPago = (compraId?: number, monto?: number) => {
    setFormPago({
      compra_id: compraId ? String(compraId) : '',
      monto: monto ? String(monto) : '',
      fecha: new Date().toISOString().slice(0, 10),
      observaciones: '',
    })
    setError(''); setModalPago(true)
  }

  const guardarPago = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formPago.monto || !formPago.fecha) { setError('Monto y fecha son obligatorios'); return }
    setGuardando(true); setError('')
    const res = await fetch('/api/pagos-proveedor', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proveedor_id: fichaId,
        compra_id: formPago.compra_id ? Number(formPago.compra_id) : null,
        monto: Number(formPago.monto),
        fecha: formPago.fecha,
        observaciones: formPago.observaciones || null,
      }),
    })
    if (res.ok) {
      await Promise.all([cargarFicha(fichaId!), cargarProveedores()])
      setModalPago(false)
    } else { const d = await res.json(); setError(d.error ?? 'Error') }
    setGuardando(false)
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const confirmarEliminar = async () => {
    if (!eliminando) return
    setCargandoEliminar(true)
    const rutas: Record<string, string> = {
      proveedor: '/api/proveedores',
      compra:    '/api/compras-proveedor',
      pago:      '/api/pagos-proveedor',
    }
    await fetch(`${rutas[eliminando.tipo]}/${eliminando.id}`, { method: 'DELETE' })
    if (eliminando.tipo === 'proveedor') { await cargarProveedores(); cerrarFicha() }
    else { await Promise.all([cargarFicha(fichaId!), cargarProveedores()]) }
    setEliminando(null); setCargandoEliminar(false)
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  // Vista ficha de proveedor
  if (fichaId && provActual) {
    const deudaPendiente = compras
      .filter(c => c.estado_pago === 'pendiente')
      .reduce((s, c) => s + c.monto_total - c.total_pagado_compra, 0)

    return (
      <div className="space-y-5">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500">
          <button onClick={cerrarFicha} className="hover:underline">Proveedores</button>
          <span className="mx-2">/</span>
          <span className="text-gray-800 font-medium">{provActual.nombre}</span>
        </div>

        {/* Card resumen */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{provActual.nombre}</h2>
              <div className="mt-1 space-y-0.5 text-sm text-gray-500">
                {provActual.telefono && <p>📞 {provActual.telefono}</p>}
                {provActual.condicion_pago && (
                  <p>Condición: <span className="font-medium">{LABEL_COND[provActual.condicion_pago] ?? provActual.condicion_pago}</span></p>
                )}
              </div>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-xl font-bold text-gray-700">{fmt(provActual.total_compras)}</p>
                <p className="text-xs text-gray-400">Total compras</p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-600">{fmt(provActual.total_pagado)}</p>
                <p className="text-xs text-gray-400">Pagado</p>
              </div>
              <div>
                <p className={`text-xl font-bold ${provActual.deuda_actual > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {fmt(provActual.deuda_actual)}
                </p>
                <p className="text-xs text-gray-400">Deuda actual</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => abrirProv(provActual)}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                Editar
              </button>
              <button onClick={() => setEliminando({ tipo: 'proveedor', id: provActual.id, label: provActual.nombre })}
                className="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50">
                Eliminar
              </button>
            </div>
          </div>
        </div>

        {/* Compras */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">
              Compras ({compras.length})
              {deudaPendiente > 0 && (
                <span className="ml-2 text-sm font-normal text-red-500">
                  — {fmt(deudaPendiente)} pendiente de pago
                </span>
              )}
            </h3>
            <div className="flex gap-2">
              <button onClick={() => abrirPago()}
                className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">
                + Registrar pago
              </button>
              <button onClick={() => abrirCompra()}
                className="text-xs px-3 py-1.5 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#2a2a4e]">
                + Nueva compra
              </button>
            </div>
          </div>

          {compras.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              No hay compras registradas para este proveedor.
            </div>
          ) : (
            <div className="space-y-2">
              {compras.map((c) => {
                const saldo = c.monto_total - c.total_pagado_compra
                return (
                  <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-800">{c.descripcion}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            c.estado_pago === 'pagado'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {c.estado_pago === 'pagado' ? '✓ Pagado' : 'Pendiente'}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">
                          <span>{c.fecha}</span>
                          {c.obra_nombre && <span>Obra: {c.obra_nombre}</span>}
                          {c.total_pagado_compra > 0 && (
                            <span className="text-green-600">Pagado: {fmt(c.total_pagado_compra)}</span>
                          )}
                          {saldo > 0 && (
                            <span className="text-red-500">Saldo: {fmt(saldo)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-800">{fmt(c.monto_total)}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {c.estado_pago === 'pendiente' && (
                          <button
                            onClick={() => abrirPago(c.id, saldo)}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                            Pagar
                          </button>
                        )}
                        <button onClick={() => abrirCompra(c)}
                          className="text-xs text-blue-600 hover:underline">Editar</button>
                        <button onClick={() => setEliminando({ tipo: 'compra', id: c.id, label: c.descripcion })}
                          className="text-xs text-red-500 hover:underline">Eliminar</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagos */}
        {pagos.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Historial de pagos ({pagos.length})</h3>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Compra</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Observaciones</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Monto</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{p.fecha}</td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">
                        {p.compra_descripcion ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{p.observaciones ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">{fmt(p.monto)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setEliminando({ tipo: 'pago', id: p.id, label: `pago de ${fmt(p.monto)} del ${p.fecha}` })}
                          className="text-xs text-red-400 hover:underline">
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modales ficha */}
        {modalCompra && (
          <Modal titulo={editCompra ? 'Editar compra' : 'Nueva compra'} onClose={() => setModalCompra(false)}>
            <form onSubmit={guardarCompra} className="space-y-4">
              <div>
                <label className="label">Descripción <span className="text-red-500">*</span></label>
                <input autoFocus type="text" value={formCompra.descripcion}
                  onChange={(e) => setFormCompra({ ...formCompra, descripcion: e.target.value })}
                  className="input" placeholder="Ej: Hierros y cemento" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Monto total ($) <span className="text-red-500">*</span></label>
                  <input type="number" min="0" step="100" value={formCompra.monto_total}
                    onChange={(e) => setFormCompra({ ...formCompra, monto_total: e.target.value })}
                    className="input" placeholder="0" />
                </div>
                <div>
                  <label className="label">Fecha <span className="text-red-500">*</span></label>
                  <input type="date" value={formCompra.fecha}
                    onChange={(e) => setFormCompra({ ...formCompra, fecha: e.target.value })}
                    className="input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Obra</label>
                  <select value={formCompra.obra_id}
                    onChange={(e) => setFormCompra({ ...formCompra, obra_id: e.target.value })}
                    className="input">
                    <option value="">— Sin obra —</option>
                    {obras.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Estado</label>
                  <select value={formCompra.estado_pago}
                    onChange={(e) => setFormCompra({ ...formCompra, estado_pago: e.target.value })}
                    className="input">
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                  </select>
                </div>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <BotonesForm onCancelar={() => setModalCompra(false)} guardando={guardando}
                labelGuardar={editCompra ? 'Guardar cambios' : 'Registrar compra'} />
            </form>
          </Modal>
        )}

        {modalPago && (
          <Modal titulo="Registrar pago" onClose={() => setModalPago(false)}>
            <form onSubmit={guardarPago} className="space-y-4">
              <div>
                <label className="label">Compra a imputar (opcional)</label>
                <select value={formPago.compra_id}
                  onChange={(e) => {
                    const c = compras.find(c => c.id === Number(e.target.value))
                    setFormPago({
                      ...formPago, compra_id: e.target.value,
                      monto: c ? String(c.monto_total - c.total_pagado_compra) : formPago.monto,
                    })
                  }}
                  className="input">
                  <option value="">— Pago general —</option>
                  {compras.filter(c => c.estado_pago === 'pendiente').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.descripcion} ({fmt(c.monto_total - c.total_pagado_compra)} pendiente)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Monto ($) <span className="text-red-500">*</span></label>
                  <input type="number" min="0" step="100" value={formPago.monto}
                    onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
                    className="input" placeholder="0" />
                </div>
                <div>
                  <label className="label">Fecha <span className="text-red-500">*</span></label>
                  <input type="date" value={formPago.fecha}
                    onChange={(e) => setFormPago({ ...formPago, fecha: e.target.value })}
                    className="input" />
                </div>
              </div>
              <div>
                <label className="label">Observaciones</label>
                <input type="text" value={formPago.observaciones}
                  onChange={(e) => setFormPago({ ...formPago, observaciones: e.target.value })}
                  className="input" placeholder="Opcional" />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <BotonesForm onCancelar={() => setModalPago(false)} guardando={guardando}
                labelGuardar="Registrar pago" />
            </form>
          </Modal>
        )}

        {eliminando && (
          <ConfirmEliminar
            mensaje={`¿Mover "${eliminando.label}" a la papelera?`}
            onConfirmar={confirmarEliminar}
            onCancelar={() => setEliminando(null)}
            cargando={cargandoEliminar}
          />
        )}
      </div>
    )
  }

  // ─── Vista lista de proveedores ───────────────────────────────────────────

  const deudaTotal = proveedores.reduce((s, p) => s + p.deuda_actual, 0)

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {proveedores.length} proveedores ·{' '}
            <span className={deudaTotal > 0 ? 'text-red-500 font-medium' : 'text-gray-500'}>
              {fmt(deudaTotal)} deuda total
            </span>
          </p>
        </div>
        <button onClick={() => abrirProv()}
          className="px-4 py-2 bg-[#1a1a2e] text-white text-sm rounded-lg hover:bg-[#2a2a4e]">
          + Nuevo proveedor
        </button>
      </div>

      {/* Tabla */}
      {proveedores.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          No hay proveedores. Creá el primero con el botón de arriba.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Proveedor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Condición</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total compras</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pagado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Deuda</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => abrirFicha(p.id)}
                      className="font-medium text-[#1a1a2e] hover:underline text-left"
                    >
                      {p.nombre}
                    </button>
                    {p.telefono && (
                      <p className="text-xs text-gray-400">{p.telefono}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {LABEL_COND[p.condicion_pago ?? ''] ?? p.condicion_pago ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmt(p.total_compras)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{fmt(p.total_pagado)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${p.deuda_actual > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {fmt(p.deuda_actual)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => abrirFicha(p.id)}
                        className="text-xs text-blue-600 hover:underline">Ver</button>
                      <button onClick={() => abrirProv(p)}
                        className="text-xs text-gray-500 hover:underline">Editar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nuevo/editar proveedor */}
      {modalProv && (
        <Modal titulo={editProv ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={() => setModalProv(false)}>
          <form onSubmit={guardarProv} className="space-y-4">
            <div>
              <label className="label">Nombre <span className="text-red-500">*</span></label>
              <input autoFocus type="text" value={formProv.nombre}
                onChange={(e) => setFormProv({ ...formProv, nombre: e.target.value })}
                className="input" placeholder="Nombre del proveedor" />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input type="text" value={formProv.telefono}
                onChange={(e) => setFormProv({ ...formProv, telefono: e.target.value })}
                className="input" placeholder="351-555-0000" />
            </div>
            <div>
              <label className="label">Condición de pago</label>
              <select value={formProv.condicion_pago}
                onChange={(e) => setFormProv({ ...formProv, condicion_pago: e.target.value })}
                className="input">
                {CONDICIONES.map((c) => <option key={c} value={c}>{LABEL_COND[c]}</option>)}
              </select>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <BotonesForm onCancelar={() => setModalProv(false)} guardando={guardando}
              labelGuardar={editProv ? 'Guardar cambios' : 'Crear proveedor'} />
          </form>
        </Modal>
      )}

      {eliminando && (
        <ConfirmEliminar
          mensaje={`¿Mover "${eliminando.label}" a la papelera?`}
          onConfirmar={confirmarEliminar}
          onCancelar={() => setEliminando(null)}
          cargando={cargandoEliminar}
        />
      )}
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function BotonesForm({ onCancelar, guardando, labelGuardar }: {
  onCancelar: () => void; guardando: boolean; labelGuardar: string
}) {
  return (
    <div className="flex gap-3 justify-end pt-2">
      <button type="button" onClick={onCancelar}
        className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
        Cancelar
      </button>
      <button type="submit" disabled={guardando}
        className="px-4 py-2 text-sm bg-[#1a1a2e] text-white rounded-lg hover:bg-[#2a2a4e] disabled:opacity-50">
        {guardando ? 'Guardando...' : labelGuardar}
      </button>
    </div>
  )
}
