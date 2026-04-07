'use client'

import { useEffect, useState, useCallback } from 'react'
import Modal from '@/components/Modal'
import ConfirmEliminar from '@/components/ConfirmEliminar'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Ingreso {
  id: number
  obra_id: number | null
  cliente_id: number | null
  tipo: string
  monto: number
  forma_pago: string
  fecha: string
  observaciones: string | null
  cliente_nombre: string | null
  obra_nombre: string | null
}

interface GastoFijo {
  id: number
  concepto: string
  mes: number
  anio: number
  monto: number
  estado: 'sin_pagar' | 'pagado'
  fecha_pago: string | null
}

interface GastoVariable {
  id: number
  concepto: string
  categoria: string
  monto: number
  fecha: string
  observaciones: string | null
}

interface Obra { id: number; nombre: string; cliente_id: number }
interface Cliente { id: number; nombre: string }

// ─── Constantes ───────────────────────────────────────────────────────────────

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const TIPOS_INGRESO = ['anticipo','entrega_materiales','pago_parcial','pago_final']
const FORMAS_PAGO   = ['transferencia','efectivo','cheque']
const CATEGORIAS    = ['Transporte','Herramientas','Materiales','Varios']

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const hoy = new Date()

// ─── Componente principal ─────────────────────────────────────────────────────

export default function FinanzasPage() {
  const [mes,  setMes]  = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())

  const [ingresos,  setIngresos]  = useState<Ingreso[]>([])
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>([])
  const [gastosVar,   setGastosVar]   = useState<GastoVariable[]>([])

  const [obras,    setObras]    = useState<Obra[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])

  // ── Modales ────────────────────────────────────────────────────────────────
  const [modalIngreso,  setModalIngreso]  = useState(false)
  const [modalGastoFijo, setModalGastoFijo] = useState(false)
  const [modalGastoVar,  setModalGastoVar]  = useState(false)

  const [editIngreso,  setEditIngreso]  = useState<Ingreso | null>(null)
  const [editGastoFijo, setEditGastoFijo] = useState<GastoFijo | null>(null)
  const [editGastoVar,  setEditGastoVar]  = useState<GastoVariable | null>(null)

  const [eliminando, setEliminando] = useState<{ tipo: string; id: number; label: string } | null>(null)
  const [cargandoEliminar, setCargandoEliminar] = useState(false)

  // ── Forms ──────────────────────────────────────────────────────────────────
  const [formIngreso, setFormIngreso] = useState({
    obra_id: '', cliente_id: '', tipo: 'anticipo', monto: '',
    forma_pago: 'transferencia', fecha: hoy.toISOString().slice(0,10), observaciones: '',
  })
  const [formGastoFijo, setFormGastoFijo] = useState({
    concepto: '', monto: '', mes: String(mes), anio: String(anio),
  })
  const [formGastoVar, setFormGastoVar] = useState({
    concepto: '', categoria: 'Varios', monto: '',
    fecha: hoy.toISOString().slice(0,10), observaciones: '',
  })

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // ── Carga de datos ─────────────────────────────────────────────────────────
  const cargarPeriodo = useCallback(async () => {
    const [resI, resF, resV] = await Promise.all([
      fetch(`/api/ingresos?mes=${mes}&anio=${anio}`),
      fetch(`/api/gastos-fijos?mes=${mes}&anio=${anio}`),
      fetch(`/api/gastos-variables?mes=${mes}&anio=${anio}`),
    ])
    setIngresos(await resI.json())
    setGastosFijos(await resF.json())
    setGastosVar(await resV.json())
  }, [mes, anio])

  useEffect(() => { cargarPeriodo() }, [cargarPeriodo])

  useEffect(() => {
    Promise.all([fetch('/api/obras'), fetch('/api/clientes')]).then(async ([ro, rc]) => {
      setObras(await ro.json())
      setClientes(await rc.json())
    })
  }, [])

  // ── Totales ────────────────────────────────────────────────────────────────
  const totalIngresos   = ingresos.reduce((s, i) => s + i.monto, 0)
  const totalFijos      = gastosFijos.reduce((s, g) => s + g.monto, 0)
  const totalVariables  = gastosVar.reduce((s, g) => s + g.monto, 0)
  const totalGastos     = totalFijos + totalVariables
  const resultado       = totalIngresos - totalGastos

  // ── Helpers modales ────────────────────────────────────────────────────────
  const abrirIngreso = (i?: Ingreso) => {
    setEditIngreso(i ?? null)
    setFormIngreso(i ? {
      obra_id: i.obra_id?.toString() ?? '',
      cliente_id: i.cliente_id?.toString() ?? '',
      tipo: i.tipo, monto: String(i.monto),
      forma_pago: i.forma_pago, fecha: i.fecha,
      observaciones: i.observaciones ?? '',
    } : { obra_id: '', cliente_id: '', tipo: 'anticipo', monto: '',
          forma_pago: 'transferencia', fecha: hoy.toISOString().slice(0,10), observaciones: '' })
    setError(''); setModalIngreso(true)
  }

  const abrirGastoFijo = (g?: GastoFijo) => {
    setEditGastoFijo(g ?? null)
    setFormGastoFijo(g
      ? { concepto: g.concepto, monto: String(g.monto), mes: String(g.mes), anio: String(g.anio) }
      : { concepto: '', monto: '', mes: String(mes), anio: String(anio) })
    setError(''); setModalGastoFijo(true)
  }

  const abrirGastoVar = (g?: GastoVariable) => {
    setEditGastoVar(g ?? null)
    setFormGastoVar(g
      ? { concepto: g.concepto, categoria: g.categoria, monto: String(g.monto),
          fecha: g.fecha, observaciones: g.observaciones ?? '' }
      : { concepto: '', categoria: 'Varios', monto: '',
          fecha: hoy.toISOString().slice(0,10), observaciones: '' })
    setError(''); setModalGastoVar(true)
  }

  // ── Guardar ────────────────────────────────────────────────────────────────
  const guardarIngreso = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formIngreso.monto || !formIngreso.fecha) { setError('Monto y fecha son obligatorios'); return }
    setGuardando(true); setError('')
    const url    = editIngreso ? `/api/ingresos/${editIngreso.id}` : '/api/ingresos'
    const method = editIngreso ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formIngreso,
        obra_id:    formIngreso.obra_id    ? Number(formIngreso.obra_id)    : null,
        cliente_id: formIngreso.cliente_id ? Number(formIngreso.cliente_id) : null,
        monto: Number(formIngreso.monto),
      }),
    })
    if (res.ok) { await cargarPeriodo(); setModalIngreso(false) }
    else { const d = await res.json(); setError(d.error ?? 'Error') }
    setGuardando(false)
  }

  const guardarGastoFijo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formGastoFijo.concepto || !formGastoFijo.monto) { setError('Concepto y monto son obligatorios'); return }
    setGuardando(true); setError('')
    const url    = editGastoFijo ? `/api/gastos-fijos/${editGastoFijo.id}` : '/api/gastos-fijos'
    const method = editGastoFijo ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formGastoFijo, monto: Number(formGastoFijo.monto),
        mes: Number(formGastoFijo.mes), anio: Number(formGastoFijo.anio) }),
    })
    if (res.ok) { await cargarPeriodo(); setModalGastoFijo(false) }
    else { const d = await res.json(); setError(d.error ?? 'Error') }
    setGuardando(false)
  }

  const guardarGastoVar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formGastoVar.concepto || !formGastoVar.monto || !formGastoVar.fecha) {
      setError('Concepto, monto y fecha son obligatorios'); return
    }
    setGuardando(true); setError('')
    const url    = editGastoVar ? `/api/gastos-variables/${editGastoVar.id}` : '/api/gastos-variables'
    const method = editGastoVar ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formGastoVar, monto: Number(formGastoVar.monto) }),
    })
    if (res.ok) { await cargarPeriodo(); setModalGastoVar(false) }
    else { const d = await res.json(); setError(d.error ?? 'Error') }
    setGuardando(false)
  }

  // ── Marcar pagado (inline, sin modal) ─────────────────────────────────────
  const marcarPagado = async (id: number) => {
    await fetch(`/api/gastos-fijos/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'pagado' }),
    })
    await cargarPeriodo()
  }

  // ── Eliminar ───────────────────────────────────────────────────────────────
  const confirmarEliminar = async () => {
    if (!eliminando) return
    setCargandoEliminar(true)
    const rutas: Record<string, string> = {
      ingreso: '/api/ingresos', gastoFijo: '/api/gastos-fijos', gastoVar: '/api/gastos-variables',
    }
    await fetch(`${rutas[eliminando.tipo]}/${eliminando.id}`, { method: 'DELETE' })
    await cargarPeriodo()
    setEliminando(null); setCargandoEliminar(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Selector de período */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none bg-white"
        >
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select
          value={anio}
          onChange={(e) => setAnio(Number(e.target.value))}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none bg-white"
        >
          {[2024, 2025, 2026, 2027].map((a) => <option key={a}>{a}</option>)}
        </select>
        <span className="text-sm text-gray-500 ml-1">
          {MESES[mes - 1]} {anio}
        </span>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tarjeta label="Ingresos" valor={totalIngresos} color="text-green-600" />
        <Tarjeta label="Gastos fijos" valor={totalFijos} color="text-red-500" />
        <Tarjeta label="Gastos variables" valor={totalVariables} color="text-orange-500" />
        <Tarjeta
          label="Resultado neto"
          valor={resultado}
          color={resultado >= 0 ? 'text-green-600' : 'text-red-600'}
        />
      </div>

      {/* ── Panel Ingresos ── */}
      <Panel
        titulo="Ingresos"
        total={totalIngresos}
        colorTotal="text-green-600"
        onNuevo={() => abrirIngreso()}
        labelNuevo="+ Registrar cobro"
      >
        {ingresos.length === 0 ? (
          <Vacio texto="Sin ingresos este mes." />
        ) : (
          ingresos.map((i) => (
            <FilaItem
              key={i.id}
              principal={`${LABEL_TIPO[i.tipo] ?? i.tipo}${i.obra_nombre ? ` — ${i.obra_nombre}` : ''}`}
              secundario={`${i.cliente_nombre ?? '—'} · ${i.fecha} · ${LABEL_FORMA[i.forma_pago] ?? i.forma_pago}`}
              monto={i.monto}
              colorMonto="text-green-600"
              nota={i.observaciones}
              onEditar={() => abrirIngreso(i)}
              onEliminar={() => setEliminando({ tipo: 'ingreso', id: i.id, label: `${LABEL_TIPO[i.tipo]} del ${i.fecha}` })}
            />
          ))
        )}
      </Panel>

      {/* ── Panel Gastos fijos ── */}
      <Panel
        titulo="Gastos fijos"
        total={totalFijos}
        colorTotal="text-red-500"
        onNuevo={() => abrirGastoFijo()}
        labelNuevo="+ Agregar gasto fijo"
      >
        {gastosFijos.length === 0 ? (
          <Vacio texto="Sin gastos fijos este mes." />
        ) : (
          gastosFijos.map((g) => (
            <div key={g.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{g.concepto}</p>
                {g.fecha_pago && <p className="text-xs text-gray-400">Pagado el {g.fecha_pago}</p>}
              </div>
              <span className="text-sm font-semibold text-red-500 flex-shrink-0">{fmt(g.monto)}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                {g.estado === 'sin_pagar' ? (
                  <button
                    onClick={() => marcarPagado(g.id)}
                    className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    Marcar pagado
                  </button>
                ) : (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg">✓ Pagado</span>
                )}
                <button onClick={() => abrirGastoFijo(g)} className="text-xs text-blue-600 hover:underline">Editar</button>
                <button onClick={() => setEliminando({ tipo: 'gastoFijo', id: g.id, label: g.concepto })} className="text-xs text-red-500 hover:underline">Eliminar</button>
              </div>
            </div>
          ))
        )}
      </Panel>

      {/* ── Panel Gastos variables ── */}
      <Panel
        titulo="Gastos variables"
        total={totalVariables}
        colorTotal="text-orange-500"
        onNuevo={() => abrirGastoVar()}
        labelNuevo="+ Agregar gasto"
      >
        {gastosVar.length === 0 ? (
          <Vacio texto="Sin gastos variables este mes." />
        ) : (
          gastosVar.map((g) => (
            <FilaItem
              key={g.id}
              principal={g.concepto}
              secundario={`${g.categoria} · ${g.fecha}`}
              monto={g.monto}
              colorMonto="text-orange-500"
              nota={g.observaciones}
              onEditar={() => abrirGastoVar(g)}
              onEliminar={() => setEliminando({ tipo: 'gastoVar', id: g.id, label: g.concepto })}
            />
          ))
        )}
      </Panel>

      {/* ══ MODALES ══════════════════════════════════════════════════════════ */}

      {modalIngreso && (
        <Modal titulo={editIngreso ? 'Editar ingreso' : 'Registrar cobro'} onClose={() => setModalIngreso(false)}>
          <form onSubmit={guardarIngreso} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Tipo <span className="text-red-500">*</span></label>
                <select value={formIngreso.tipo} onChange={(e) => setFormIngreso({ ...formIngreso, tipo: e.target.value })} className="input">
                  {TIPOS_INGRESO.map((t) => <option key={t} value={t}>{LABEL_TIPO[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Forma de pago</label>
                <select value={formIngreso.forma_pago} onChange={(e) => setFormIngreso({ ...formIngreso, forma_pago: e.target.value })} className="input">
                  {FORMAS_PAGO.map((f) => <option key={f} value={f}>{LABEL_FORMA[f]}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Monto ($) <span className="text-red-500">*</span></label>
                <input type="number" min="0" step="100" value={formIngreso.monto}
                  onChange={(e) => setFormIngreso({ ...formIngreso, monto: e.target.value })}
                  className="input" placeholder="0" />
              </div>
              <div>
                <label className="label">Fecha <span className="text-red-500">*</span></label>
                <input type="date" value={formIngreso.fecha}
                  onChange={(e) => setFormIngreso({ ...formIngreso, fecha: e.target.value })}
                  className="input" />
              </div>
            </div>
            <div>
              <label className="label">Obra</label>
              <select value={formIngreso.obra_id} onChange={(e) => setFormIngreso({ ...formIngreso, obra_id: e.target.value })} className="input">
                <option value="">— Sin obra —</option>
                {obras.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Cliente</label>
              <select value={formIngreso.cliente_id} onChange={(e) => setFormIngreso({ ...formIngreso, cliente_id: e.target.value })} className="input">
                <option value="">— Sin cliente —</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Observaciones</label>
              <input type="text" value={formIngreso.observaciones}
                onChange={(e) => setFormIngreso({ ...formIngreso, observaciones: e.target.value })}
                className="input" placeholder="Opcional" />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <BotonesForm onCancelar={() => setModalIngreso(false)} guardando={guardando}
              labelGuardar={editIngreso ? 'Guardar cambios' : 'Registrar cobro'} />
          </form>
        </Modal>
      )}

      {modalGastoFijo && (
        <Modal titulo={editGastoFijo ? 'Editar gasto fijo' : 'Nuevo gasto fijo'} onClose={() => setModalGastoFijo(false)}>
          <form onSubmit={guardarGastoFijo} className="space-y-4">
            <div>
              <label className="label">Concepto <span className="text-red-500">*</span></label>
              <input autoFocus type="text" value={formGastoFijo.concepto}
                onChange={(e) => setFormGastoFijo({ ...formGastoFijo, concepto: e.target.value })}
                className="input" placeholder="Ej: Alquiler, Contador..." />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Monto ($) <span className="text-red-500">*</span></label>
                <input type="number" min="0" step="100" value={formGastoFijo.monto}
                  onChange={(e) => setFormGastoFijo({ ...formGastoFijo, monto: e.target.value })}
                  className="input" placeholder="0" />
              </div>
              <div>
                <label className="label">Mes</label>
                <select value={formGastoFijo.mes} onChange={(e) => setFormGastoFijo({ ...formGastoFijo, mes: e.target.value })} className="input">
                  {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Año</label>
                <select value={formGastoFijo.anio} onChange={(e) => setFormGastoFijo({ ...formGastoFijo, anio: e.target.value })} className="input">
                  {[2024,2025,2026,2027].map((a) => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <BotonesForm onCancelar={() => setModalGastoFijo(false)} guardando={guardando}
              labelGuardar={editGastoFijo ? 'Guardar cambios' : 'Crear gasto'} />
          </form>
        </Modal>
      )}

      {modalGastoVar && (
        <Modal titulo={editGastoVar ? 'Editar gasto variable' : 'Nuevo gasto variable'} onClose={() => setModalGastoVar(false)}>
          <form onSubmit={guardarGastoVar} className="space-y-4">
            <div>
              <label className="label">Concepto <span className="text-red-500">*</span></label>
              <input autoFocus type="text" value={formGastoVar.concepto}
                onChange={(e) => setFormGastoVar({ ...formGastoVar, concepto: e.target.value })}
                className="input" placeholder="Ej: Combustible, Herramienta..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Categoría</label>
                <select value={formGastoVar.categoria} onChange={(e) => setFormGastoVar({ ...formGastoVar, categoria: e.target.value })} className="input">
                  {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Monto ($) <span className="text-red-500">*</span></label>
                <input type="number" min="0" step="100" value={formGastoVar.monto}
                  onChange={(e) => setFormGastoVar({ ...formGastoVar, monto: e.target.value })}
                  className="input" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="label">Fecha <span className="text-red-500">*</span></label>
              <input type="date" value={formGastoVar.fecha}
                onChange={(e) => setFormGastoVar({ ...formGastoVar, fecha: e.target.value })}
                className="input" />
            </div>
            <div>
              <label className="label">Observaciones</label>
              <input type="text" value={formGastoVar.observaciones}
                onChange={(e) => setFormGastoVar({ ...formGastoVar, observaciones: e.target.value })}
                className="input" placeholder="Opcional" />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <BotonesForm onCancelar={() => setModalGastoVar(false)} guardando={guardando}
              labelGuardar={editGastoVar ? 'Guardar cambios' : 'Registrar gasto'} />
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

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function Tarjeta({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{fmt(valor)}</p>
    </div>
  )
}

function Panel({ titulo, total, colorTotal, onNuevo, labelNuevo, children }: {
  titulo: string; total: number; colorTotal: string
  onNuevo: () => void; labelNuevo: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-800">{titulo}</h3>
          <span className={`text-sm font-bold ${colorTotal}`}>{fmt(total)}</span>
        </div>
        <button onClick={onNuevo}
          className="text-xs px-3 py-1.5 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#2a2a4e]">
          {labelNuevo}
        </button>
      </div>
      <div className="px-5 py-2">{children}</div>
    </div>
  )
}

function FilaItem({ principal, secundario, monto, colorMonto, nota, onEditar, onEliminar }: {
  principal: string; secundario: string; monto: number; colorMonto: string
  nota?: string | null; onEditar: () => void; onEliminar: () => void
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{principal}</p>
        <p className="text-xs text-gray-400">{secundario}</p>
        {nota && <p className="text-xs text-gray-400 italic">{nota}</p>}
      </div>
      <span className={`text-sm font-semibold flex-shrink-0 ${colorMonto}`}>{fmt(monto)}</span>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={onEditar}   className="text-xs text-blue-600 hover:underline">Editar</button>
        <button onClick={onEliminar} className="text-xs text-red-500 hover:underline">Eliminar</button>
      </div>
    </div>
  )
}

function Vacio({ texto }: { texto: string }) {
  return <p className="text-sm text-gray-400 py-4 text-center">{texto}</p>
}

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

// ─── Mapeos de labels ──────────────────────────────────────────────────────────

const LABEL_TIPO: Record<string, string> = {
  anticipo:           'Anticipo',
  entrega_materiales: 'Entrega materiales',
  pago_parcial:       'Pago parcial',
  pago_final:         'Pago final',
}

const LABEL_FORMA: Record<string, string> = {
  transferencia: 'Transferencia',
  efectivo:      'Efectivo',
  cheque:        'Cheque',
}
