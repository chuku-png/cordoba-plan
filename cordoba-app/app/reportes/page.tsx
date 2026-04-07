'use client'

import { useState } from 'react'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

function mesAnioActual() {
  const now = new Date()
  return {
    mes: String(now.getMonth() + 1),
    anio: String(now.getFullYear()),
  }
}

function semanaActual() {
  const now = new Date()
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1
  const lunes = new Date(now); lunes.setDate(now.getDate() - day)
  const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { desde: fmt(lunes), hasta: fmt(domingo) }
}

export default function ReportesPage() {
  const { mes: mesDefault, anio: anioDefault } = mesAnioActual()
  const { desde: desdeDefault, hasta: hastaDefault } = semanaActual()

  const [mes, setMes] = useState(mesDefault)
  const [anio, setAnio] = useState(anioDefault)
  const [desde, setDesde] = useState(desdeDefault)
  const [hasta, setHasta] = useState(hastaDefault)
  const [descargando, setDescargando] = useState<string | null>(null)

  const descargar = async (tipo: string, extra?: Record<string, string>) => {
    setDescargando(tipo)
    try {
      const params = new URLSearchParams({ tipo, ...extra })
      const res = await fetch(`/api/exportar?${params}`)
      if (!res.ok) {
        const err = await res.json()
        alert(`Error: ${err.error}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = res.headers.get('content-disposition') ?? ''
      const match = cd.match(/filename="(.+)"/)
      a.download = match?.[1] ?? `reporte_${tipo}`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDescargando(null)
    }
  }

  const BtnDescarga = ({
    tipo,
    label,
    extra,
    formato,
    descripcion,
  }: {
    tipo: string
    label: string
    extra?: Record<string, string>
    formato: 'pdf' | 'excel'
    descripcion: string
  }) => {
    const isPDF = formato === 'pdf'
    const loading = descargando === tipo
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isPDF ? 'bg-red-50' : 'bg-green-50'}`}>
            {isPDF ? (
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            ) : (
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{descripcion}</p>
            <span className={`text-xs font-medium mt-1 inline-block ${isPDF ? 'text-red-500' : 'text-green-600'}`}>
              {formato.toUpperCase()}
            </span>
          </div>
        </div>
        <button
          onClick={() => descargar(tipo, extra)}
          disabled={!!descargando}
          className={`px-3 py-1.5 text-xs rounded-lg text-white flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50 ${isPDF ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {loading ? (
            <>
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Generando...
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Descargar
            </>
          )}
        </button>
      </div>
    )
  }

  const anios = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i))

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Exportar reportes en PDF y Excel</p>
      </div>

      {/* Selector mes/año */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Período para reportes mensuales</p>
        <div className="flex gap-3">
          <div>
            <label className="label">Mes</label>
            <select className="input w-40" value={mes} onChange={e => setMes(e.target.value)}>
              {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Año</label>
            <select className="input w-28" value={anio} onChange={e => setAnio(e.target.value)}>
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Reportes PDF */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Reportes PDF</h2>
        <div className="space-y-3">
          <BtnDescarga
            tipo="resumen-mensual"
            label="Resumen mensual"
            extra={{ mes, anio }}
            formato="pdf"
            descripcion={`Ingresos vs gastos y resultado neto de ${MESES[Number(mes) - 1]} ${anio}`}
          />
          <BtnDescarga
            tipo="deuda-proveedores"
            label="Deuda con proveedores"
            formato="pdf"
            descripcion="Resumen de deuda actual por proveedor"
          />
        </div>
      </div>

      {/* Liquidación semanal */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Liquidación semanal</h2>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-3">
          <div className="flex gap-3">
            <div>
              <label className="label">Desde</label>
              <input className="input" type="date" value={desde} onChange={e => setDesde(e.target.value)} />
            </div>
            <div>
              <label className="label">Hasta</label>
              <input className="input" type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
            </div>
          </div>
        </div>
        <BtnDescarga
          tipo="liquidacion-semanal"
          label="Liquidación semanal de empleados"
          extra={{ desde, hasta }}
          formato="pdf"
          descripcion={`Jornales y anticipos del ${desde} al ${hasta}`}
        />
      </div>

      {/* Reportes Excel */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Reportes Excel</h2>
        <div className="space-y-3">
          <BtnDescarga
            tipo="clientes-excel"
            label="Lista de clientes"
            formato="excel"
            descripcion="Clientes con cantidad de obras activas"
          />
          <BtnDescarga
            tipo="ingresos-excel"
            label="Ingresos del mes"
            extra={{ mes, anio }}
            formato="excel"
            descripcion={`Detalle de ingresos de ${MESES[Number(mes) - 1]} ${anio}`}
          />
          <BtnDescarga
            tipo="gastos-excel"
            label="Gastos del mes"
            extra={{ mes, anio }}
            formato="excel"
            descripcion={`Gastos fijos y variables de ${MESES[Number(mes) - 1]} ${anio}`}
          />
        </div>
      </div>
    </div>
  )
}
