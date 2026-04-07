import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET /api/obras?estado=activa&cliente_id=1
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const estado = searchParams.get('estado')
  const clienteId = searchParams.get('cliente_id')

  let sql = `
    SELECT
      o.*,
      c.nombre AS cliente_nombre,
      COALESCE(SUM(i.monto), 0) AS total_cobrado,
      COALESCE(
        (SELECT SUM(cp.monto_total) FROM compras_proveedor cp
         WHERE cp.obra_id = o.id AND cp.deleted_at IS NULL), 0
      ) AS total_materiales,
      COALESCE(
        (SELECT SUM(j.monto) FROM jornales j
         WHERE j.obra_id = o.id AND j.deleted_at IS NULL), 0
      ) AS total_mano_obra
    FROM obras o
    JOIN clientes c ON c.id = o.cliente_id
    LEFT JOIN ingresos i ON i.obra_id = o.id AND i.deleted_at IS NULL
    WHERE o.deleted_at IS NULL
  `
  const args: (string | number)[] = []

  if (estado) {
    sql += ' AND o.estado = ?'
    args.push(estado)
  }
  if (clienteId) {
    sql += ' AND o.cliente_id = ?'
    args.push(Number(clienteId))
  }

  sql += ' GROUP BY o.id ORDER BY o.created_at DESC'

  const obras = db.prepare(sql).all(...args)
  return NextResponse.json(obras)
}

// POST /api/obras — crea una obra vinculada a un cliente
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { cliente_id, nombre, estado, presupuesto_original, fecha_inicio, fecha_fin } = body

  if (!cliente_id || !nombre?.trim()) {
    return NextResponse.json({ error: 'cliente_id y nombre son obligatorios' }, { status: 400 })
  }

  const clienteExiste = db.prepare('SELECT id FROM clientes WHERE id = ? AND deleted_at IS NULL').get(Number(cliente_id))
  if (!clienteExiste) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  const result = db.prepare(`
    INSERT INTO obras (cliente_id, nombre, estado, presupuesto_original, fecha_inicio, fecha_fin)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    Number(cliente_id),
    nombre.trim(),
    estado || 'activa',
    presupuesto_original || null,
    fecha_inicio || null,
    fecha_fin || null
  )

  const obra = db.prepare('SELECT * FROM obras WHERE id = ?').get(result.lastInsertRowid)
  return NextResponse.json(obra, { status: 201 })
}
