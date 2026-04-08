import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET /api/jornales?desde=2026-03-30&hasta=2026-04-05&empleado_id=1
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const desde      = searchParams.get('desde')
  const hasta      = searchParams.get('hasta')
  const empleadoId = searchParams.get('empleado_id')

  let sql = `
    SELECT
      j.*,
      e.nombre  AS empleado_nombre,
      e.jornal_habitual,
      o.nombre  AS obra_nombre
    FROM jornales j
    JOIN empleados e ON e.id = j.empleado_id
    LEFT JOIN obras o ON o.id = j.obra_id
    WHERE j.deleted_at IS NULL
  `
  const args: (string | number)[] = []

  if (desde) { sql += ' AND j.fecha >= ?'; args.push(desde) }
  if (hasta) { sql += ' AND j.fecha <= ?'; args.push(hasta) }
  if (empleadoId) { sql += ' AND j.empleado_id = ?'; args.push(Number(empleadoId)) }
  const mes  = searchParams.get('mes')
  const anio = searchParams.get('anio')
  if (mes && anio) {
    sql += ` AND strftime('%m', j.fecha) = ? AND strftime('%Y', j.fecha) = ?`
    args.push(String(mes).padStart(2,'0'), String(anio))
  }

  sql += ' ORDER BY j.fecha ASC, j.created_at ASC'

  const jornales = db.prepare(sql).all(...args)
  return NextResponse.json(jornales)
}

// POST /api/jornales — registra un jornal o anticipo
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { empleado_id, obra_id, fecha, monto, tipo, observaciones } = body

  if (!empleado_id || !fecha || !monto) {
    return NextResponse.json({ error: 'empleado_id, fecha y monto son obligatorios' }, { status: 400 })
  }

  const empleadoExiste = db.prepare(
    'SELECT id FROM empleados WHERE id = ? AND deleted_at IS NULL'
  ).get(Number(empleado_id))
  if (!empleadoExiste) return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })

  const result = db.prepare(`
    INSERT INTO jornales (empleado_id, obra_id, fecha, monto, tipo, observaciones)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    Number(empleado_id),
    obra_id ? Number(obra_id) : null,
    fecha,
    Number(monto),
    tipo || 'jornal',
    observaciones?.trim() || null
  )

  const jornal = db.prepare(`
    SELECT j.*, e.nombre AS empleado_nombre, o.nombre AS obra_nombre
    FROM jornales j
    JOIN empleados e ON e.id = j.empleado_id
    LEFT JOIN obras o ON o.id = j.obra_id
    WHERE j.id = ?
  `).get(result.lastInsertRowid)

  return NextResponse.json(jornal, { status: 201 })
}
