import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

type DocWithTable = jsPDF & { lastAutoTable: { finalY: number } }

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

// ── Helpers DB ────────────────────────────────────────────

function getMesAnio(mes: string | null, anio: string | null) {
  const now = new Date()
  const m = mes ? mes.padStart(2, '0') : String(now.getMonth() + 1).padStart(2, '0')
  const a = anio ?? String(now.getFullYear())
  return { mes: m, anio: a }
}

// ── PDF helpers ────────────────────────────────────────────

function pdfHeader(doc: jsPDF, titulo: string, subtitulo?: string) {
  doc.setFillColor(26, 26, 46)
  doc.rect(0, 0, 210, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Córdoba Construcciones', 14, 13)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(titulo, 210 - 14, 13, { align: 'right' })
  doc.setTextColor(0, 0, 0)
  if (subtitulo) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(subtitulo, 14, 30)
  }
  return subtitulo ? 36 : 28
}

// ── Reportes PDF ────────────────────────────────────────────

function pdfResumenMensual(mes: string, anio: string): Uint8Array {
  const doc = new jsPDF()
  const y0 = pdfHeader(doc, `Resumen ${mes}/${anio}`, `Resumen mensual — ${mes}/${anio}`)

  // Ingresos
  const ingresos = db.prepare(`
    SELECT i.tipo AS concepto, i.forma_pago, c.nombre AS cliente, o.nombre AS obra, i.monto, i.fecha
    FROM ingresos i
    JOIN clientes c ON c.id = i.cliente_id
    LEFT JOIN obras o ON o.id = i.obra_id
    WHERE i.deleted_at IS NULL
      AND strftime('%m', i.fecha) = ? AND strftime('%Y', i.fecha) = ?
    ORDER BY i.fecha
  `).all(mes, anio) as { concepto: string; forma_pago: string; cliente: string; obra: string | null; monto: number; fecha: string }[]

  const totalIngresos = ingresos.reduce((s, r) => s + r.monto, 0)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Ingresos', 14, y0)

  autoTable(doc, {
    startY: y0 + 4,
    head: [['Tipo', 'Cliente', 'Obra', 'Fecha', 'Monto']],
    body: ingresos.map(r => [r.concepto, r.cliente, r.obra ?? '—', r.fecha, fmt(r.monto)]),
    foot: [['', '', '', 'Total', fmt(totalIngresos)]],
    headStyles: { fillColor: [26, 26, 46] },
    footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
    styles: { fontSize: 8 },
    columnStyles: { 4: { halign: 'right' } },
  })

  // Gastos fijos
  const gastosFijos = db.prepare(`
    SELECT concepto, monto, estado FROM gastos_fijos
    WHERE deleted_at IS NULL AND mes = ? AND anio = ?
    ORDER BY concepto
  `).all(Number(mes), Number(anio)) as { concepto: string; monto: number; estado: string }[]

  const totalGastosFijos = gastosFijos.reduce((s, r) => s + r.monto, 0)
  const y1 = (doc as DocWithTable).lastAutoTable.finalY + 10

  doc.setFont('helvetica', 'bold')
  doc.text('Gastos fijos', 14, y1)

  autoTable(doc, {
    startY: y1 + 4,
    head: [['Concepto', 'Estado', 'Monto']],
    body: gastosFijos.map(r => [r.concepto, r.estado, fmt(r.monto)]),
    foot: [['', 'Total', fmt(totalGastosFijos)]],
    headStyles: { fillColor: [26, 26, 46] },
    footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
    styles: { fontSize: 8 },
    columnStyles: { 2: { halign: 'right' } },
  })

  // Gastos variables
  const gastosVariables = db.prepare(`
    SELECT concepto, categoria, monto, fecha FROM gastos_variables
    WHERE deleted_at IS NULL
      AND strftime('%m', fecha) = ? AND strftime('%Y', fecha) = ?
    ORDER BY fecha
  `).all(mes, anio) as { concepto: string; categoria: string; monto: number; fecha: string }[]

  const totalGastosVariables = gastosVariables.reduce((s, r) => s + r.monto, 0)
  const y2 = (doc as DocWithTable).lastAutoTable.finalY + 10

  doc.setFont('helvetica', 'bold')
  doc.text('Gastos variables', 14, y2)

  autoTable(doc, {
    startY: y2 + 4,
    head: [['Concepto', 'Categoría', 'Fecha', 'Monto']],
    body: gastosVariables.map(r => [r.concepto, r.categoria, r.fecha, fmt(r.monto)]),
    foot: [['', '', 'Total', fmt(totalGastosVariables)]],
    headStyles: { fillColor: [26, 26, 46] },
    footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
    styles: { fontSize: 8 },
    columnStyles: { 3: { halign: 'right' } },
  })

  // Resumen neto
  const y3 = (doc as DocWithTable).lastAutoTable.finalY + 12
  const totalGastos = totalGastosFijos + totalGastosVariables
  const neto = totalIngresos - totalGastos

  autoTable(doc, {
    startY: y3,
    body: [
      ['Total ingresos', fmt(totalIngresos)],
      ['Total gastos', fmt(totalGastos)],
      ['Resultado neto', fmt(neto)],
    ],
    headStyles: { fillColor: [26, 26, 46] },
    bodyStyles: { fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' } },
    styles: { fontSize: 9 },
  })

  return new Uint8Array(doc.output('arraybuffer'))
}

function pdfDeudaProveedores(): Uint8Array {
  const doc = new jsPDF()
  const y0 = pdfHeader(doc, 'Deuda por proveedor', 'Deuda con proveedores')

  const proveedores = db.prepare(`
    SELECT
      p.nombre,
      p.condicion_pago,
      COALESCE((SELECT SUM(monto_total) FROM compras_proveedor WHERE proveedor_id = p.id AND deleted_at IS NULL), 0) AS total_compras,
      COALESCE((SELECT SUM(monto) FROM pagos_proveedor WHERE proveedor_id = p.id AND deleted_at IS NULL), 0) AS total_pagado
    FROM proveedores p
    WHERE p.deleted_at IS NULL
    ORDER BY (total_compras - total_pagado) DESC
  `).all() as { nombre: string; condicion_pago: string | null; total_compras: number; total_pagado: number }[]

  const rows = proveedores.map(p => [
    p.nombre,
    p.condicion_pago ?? '—',
    fmt(p.total_compras),
    fmt(p.total_pagado),
    fmt(p.total_compras - p.total_pagado),
  ])

  const totalDeuda = proveedores.reduce((s, p) => s + (p.total_compras - p.total_pagado), 0)

  autoTable(doc, {
    startY: y0,
    head: [['Proveedor', 'Condición', 'Total compras', 'Total pagado', 'Deuda']],
    body: rows,
    foot: [['', '', '', 'Total deuda', fmt(totalDeuda)]],
    headStyles: { fillColor: [26, 26, 46] },
    footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
    styles: { fontSize: 8 },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
  })

  return new Uint8Array(doc.output('arraybuffer'))
}

function pdfLiquidacionSemanal(desde: string, hasta: string): Uint8Array {
  const doc = new jsPDF()
  const y0 = pdfHeader(doc, 'Liquidación semanal', `Jornales ${desde} al ${hasta}`)

  const jornales = db.prepare(`
    SELECT e.nombre AS empleado, j.fecha, j.tipo, j.monto
    FROM jornales j
    JOIN empleados e ON e.id = j.empleado_id
    WHERE j.deleted_at IS NULL AND j.fecha >= ? AND j.fecha <= ?
    ORDER BY e.nombre, j.fecha
  `).all(desde, hasta) as { empleado: string; fecha: string; tipo: string; monto: number }[]

  autoTable(doc, {
    startY: y0,
    head: [['Empleado', 'Fecha', 'Tipo', 'Monto']],
    body: jornales.map(j => [j.empleado, j.fecha, j.tipo, fmt(j.monto)]),
    foot: [['', '', 'Total', fmt(jornales.reduce((s, j) => s + j.monto, 0))]],
    headStyles: { fillColor: [26, 26, 46] },
    footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
    styles: { fontSize: 8 },
    columnStyles: { 3: { halign: 'right' } },
  })

  return new Uint8Array(doc.output('arraybuffer'))
}

// ── Reportes Excel ────────────────────────────────────────────

function xlsxClientes(): Uint8Array {
  const clientes = db.prepare(`
    SELECT c.nombre, c.telefono, c.email,
      COUNT(DISTINCT o.id) AS total_obras,
      SUM(CASE WHEN o.estado = 'activa' THEN 1 ELSE 0 END) AS obras_activas
    FROM clientes c
    LEFT JOIN obras o ON o.cliente_id = c.id AND o.deleted_at IS NULL
    WHERE c.deleted_at IS NULL
    GROUP BY c.id
    ORDER BY c.nombre
  `).all() as { nombre: string; telefono: string | null; email: string | null; total_obras: number; obras_activas: number }[]

  const ws = XLSX.utils.json_to_sheet(
    clientes.map(c => ({
      'Nombre': c.nombre,
      'Teléfono': c.telefono ?? '',
      'Email': c.email ?? '',
      'Total obras': c.total_obras,
      'Obras activas': c.obras_activas,
    }))
  )
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))
}

function xlsxIngresosMes(mes: string, anio: string): Uint8Array {
  const ingresos = db.prepare(`
    SELECT i.tipo, i.forma_pago, c.nombre AS cliente, o.nombre AS obra, i.monto, i.fecha, i.observaciones
    FROM ingresos i
    JOIN clientes c ON c.id = i.cliente_id
    LEFT JOIN obras o ON o.id = i.obra_id
    WHERE i.deleted_at IS NULL
      AND strftime('%m', i.fecha) = ? AND strftime('%Y', i.fecha) = ?
    ORDER BY i.fecha
  `).all(mes, anio) as { tipo: string; forma_pago: string; cliente: string; obra: string | null; monto: number; fecha: string; observaciones: string | null }[]

  const ws = XLSX.utils.json_to_sheet(
    ingresos.map(i => ({
      'Fecha': i.fecha,
      'Tipo': i.tipo,
      'Forma de pago': i.forma_pago,
      'Cliente': i.cliente,
      'Obra': i.obra ?? '',
      'Monto': i.monto,
      'Observaciones': i.observaciones ?? '',
    }))
  )
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `Ingresos ${mes}-${anio}`)
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))
}

function xlsxGastosMes(mes: string, anio: string): Uint8Array {
  const wb = XLSX.utils.book_new()

  const gastosFijos = db.prepare(`
    SELECT concepto, monto, estado, fecha_pago FROM gastos_fijos
    WHERE deleted_at IS NULL AND mes = ? AND anio = ?
    ORDER BY concepto
  `).all(Number(mes), Number(anio)) as { concepto: string; monto: number; estado: string; fecha_pago: string | null }[]

  const wsFijos = XLSX.utils.json_to_sheet(
    gastosFijos.map(g => ({
      'Concepto': g.concepto,
      'Monto': g.monto,
      'Estado': g.estado,
      'Fecha pago': g.fecha_pago ?? '',
    }))
  )
  XLSX.utils.book_append_sheet(wb, wsFijos, 'Gastos fijos')

  const gastosVariables = db.prepare(`
    SELECT concepto, categoria, monto, fecha, observaciones FROM gastos_variables
    WHERE deleted_at IS NULL
      AND strftime('%m', fecha) = ? AND strftime('%Y', fecha) = ?
    ORDER BY fecha
  `).all(mes, anio) as { concepto: string; categoria: string; monto: number; fecha: string; observaciones: string | null }[]

  const wsVariables = XLSX.utils.json_to_sheet(
    gastosVariables.map(g => ({
      'Fecha': g.fecha,
      'Concepto': g.concepto,
      'Categoría': g.categoria,
      'Monto': g.monto,
      'Observaciones': g.observaciones ?? '',
    }))
  )
  XLSX.utils.book_append_sheet(wb, wsVariables, 'Gastos variables')

  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))
}

// ── Handler principal ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const tipo  = searchParams.get('tipo') ?? ''
  const mes   = searchParams.get('mes')
  const anio  = searchParams.get('anio')
  const desde = searchParams.get('desde') ?? ''
  const hasta = searchParams.get('hasta') ?? ''

  try {
    // ── PDF ──────────────────────────────────────────────────
    if (tipo === 'resumen-mensual') {
      const { mes: m, anio: a } = getMesAnio(mes, anio)
      const buf = pdfResumenMensual(m, a)
      return new NextResponse(buf.buffer as ArrayBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="resumen_${m}_${a}.pdf"`,
        },
      })
    }

    if (tipo === 'deuda-proveedores') {
      const buf = pdfDeudaProveedores()
      return new NextResponse(buf.buffer as ArrayBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="deuda_proveedores.pdf"',
        },
      })
    }

    if (tipo === 'liquidacion-semanal') {
      if (!desde || !hasta) return NextResponse.json({ error: 'desde y hasta son requeridos' }, { status: 400 })
      const buf = pdfLiquidacionSemanal(desde, hasta)
      return new NextResponse(buf.buffer as ArrayBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="liquidacion_${desde}_${hasta}.pdf"`,
        },
      })
    }

    // ── Excel ────────────────────────────────────────────────
    if (tipo === 'clientes-excel') {
      const buf = xlsxClientes()
      return new NextResponse(buf.buffer as ArrayBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="clientes.xlsx"',
        },
      })
    }

    if (tipo === 'ingresos-excel') {
      const { mes: m, anio: a } = getMesAnio(mes, anio)
      const buf = xlsxIngresosMes(m, a)
      return new NextResponse(buf.buffer as ArrayBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="ingresos_${m}_${a}.xlsx"`,
        },
      })
    }

    if (tipo === 'gastos-excel') {
      const { mes: m, anio: a } = getMesAnio(mes, anio)
      const buf = xlsxGastosMes(m, a)
      return new NextResponse(buf.buffer as ArrayBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="gastos_${m}_${a}.xlsx"`,
        },
      })
    }

    return NextResponse.json({
      tipos_disponibles: [
        'resumen-mensual (PDF)',
        'deuda-proveedores (PDF)',
        'liquidacion-semanal (PDF) — requiere desde= y hasta=',
        'clientes-excel (XLSX)',
        'ingresos-excel (XLSX)',
        'gastos-excel (XLSX)',
      ]
    })
  } catch (err) {
    console.error('Error exportar:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
