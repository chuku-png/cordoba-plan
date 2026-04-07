import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET /api/clientes — lista todos los clientes activos
export async function GET() {
  const clientes = db.prepare(`
    SELECT
      c.id,
      c.nombre,
      c.telefono,
      c.email,
      c.created_at,
      COUNT(o.id) AS total_obras,
      SUM(CASE WHEN o.estado = 'activa' THEN 1 ELSE 0 END) AS obras_activas
    FROM clientes c
    LEFT JOIN obras o ON o.cliente_id = c.id AND o.deleted_at IS NULL
    WHERE c.deleted_at IS NULL
    GROUP BY c.id
    ORDER BY c.nombre ASC
  `).all()

  return NextResponse.json(clientes)
}

// POST /api/clientes — crea un cliente nuevo
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nombre, telefono, email } = body

  if (!nombre?.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }

  const result = db.prepare(`
    INSERT INTO clientes (nombre, telefono, email)
    VALUES (?, ?, ?)
  `).run(nombre.trim(), telefono?.trim() || null, email?.trim() || null)

  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(result.lastInsertRowid)
  return NextResponse.json(cliente, { status: 201 })
}
