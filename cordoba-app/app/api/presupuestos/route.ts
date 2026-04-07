import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET /api/presupuestos?estado=aceptado&obra_id=2
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const estado = searchParams.get('estado')
  const obraId = searchParams.get('obra_id')

  let sql = `
    SELECT
      pr.*,
      o.nombre    AS obra_nombre,
      c.id        AS cliente_id,
      c.nombre    AS cliente_nombre
    FROM presupuestos pr
    LEFT JOIN obras o ON o.id = pr.obra_id
    LEFT JOIN clientes c ON c.id = o.cliente_id
    WHERE pr.deleted_at IS NULL
  `
  const args: (string | number)[] = []

  if (estado) { sql += ' AND pr.estado = ?';   args.push(estado) }
  if (obraId) { sql += ' AND pr.obra_id = ?';  args.push(Number(obraId)) }

  sql += ' ORDER BY pr.fecha_envio DESC'

  const presupuestos = db.prepare(sql).all(...args)
  return NextResponse.json(presupuestos)
}

// POST /api/presupuestos
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { obra_id, monto, fecha_envio, estado, archivo_path, notas } = body

  if (!monto) {
    return NextResponse.json({ error: 'monto es obligatorio' }, { status: 400 })
  }

  const result = db.prepare(`
    INSERT INTO presupuestos (obra_id, monto, fecha_envio, estado, archivo_path, notas)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    obra_id ? Number(obra_id) : null,
    Number(monto),
    fecha_envio || null,
    estado || 'sin_respuesta',
    archivo_path || null,
    notas?.trim() || null
  )

  const presupuesto = db.prepare(`
    SELECT pr.*, o.nombre AS obra_nombre, c.id AS cliente_id, c.nombre AS cliente_nombre
    FROM presupuestos pr
    LEFT JOIN obras o ON o.id = pr.obra_id
    LEFT JOIN clientes c ON c.id = o.cliente_id
    WHERE pr.id = ?
  `).get(result.lastInsertRowid)

  return NextResponse.json(presupuesto, { status: 201 })
}
