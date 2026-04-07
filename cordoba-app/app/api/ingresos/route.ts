import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET /api/ingresos?mes=4&anio=2026&cliente_id=1&obra_id=1
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const mes      = searchParams.get('mes')
  const anio     = searchParams.get('anio')
  const clienteId = searchParams.get('cliente_id')
  const obraId   = searchParams.get('obra_id')

  let sql = `
    SELECT
      i.*,
      c.nombre AS cliente_nombre,
      o.nombre AS obra_nombre
    FROM ingresos i
    LEFT JOIN clientes c ON c.id = i.cliente_id
    LEFT JOIN obras    o ON o.id = i.obra_id
    WHERE i.deleted_at IS NULL
  `
  const args: (string | number)[] = []

  if (mes && anio) {
    sql += ` AND strftime('%m', i.fecha) = ? AND strftime('%Y', i.fecha) = ?`
    args.push(String(mes).padStart(2, '0'), String(anio))
  }
  if (clienteId) { sql += ' AND i.cliente_id = ?'; args.push(Number(clienteId)) }
  if (obraId)    { sql += ' AND i.obra_id = ?';    args.push(Number(obraId)) }

  sql += ' ORDER BY i.fecha DESC, i.created_at DESC'

  const ingresos = db.prepare(sql).all(...args)
  return NextResponse.json(ingresos)
}

// POST /api/ingresos
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { obra_id, cliente_id, tipo, monto, forma_pago, fecha, observaciones } = body

  if (!tipo || !monto || !forma_pago || !fecha) {
    return NextResponse.json({ error: 'tipo, monto, forma_pago y fecha son obligatorios' }, { status: 400 })
  }

  const result = db.prepare(`
    INSERT INTO ingresos (obra_id, cliente_id, tipo, monto, forma_pago, fecha, observaciones)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    obra_id    ? Number(obra_id)    : null,
    cliente_id ? Number(cliente_id) : null,
    tipo,
    Number(monto),
    forma_pago,
    fecha,
    observaciones?.trim() || null
  )

  const ingreso = db.prepare(`
    SELECT i.*, c.nombre AS cliente_nombre, o.nombre AS obra_nombre
    FROM ingresos i
    LEFT JOIN clientes c ON c.id = i.cliente_id
    LEFT JOIN obras    o ON o.id = i.obra_id
    WHERE i.id = ?
  `).get(result.lastInsertRowid)

  return NextResponse.json(ingreso, { status: 201 })
}
