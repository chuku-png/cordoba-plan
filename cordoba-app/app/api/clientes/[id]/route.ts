import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

type Params = { params: { id: string } }

// GET /api/clientes/[id] — ficha completa con obras y resumen financiero
export async function GET(_req: NextRequest, { params }: Params) {
  const id = Number(params.id)

  const cliente = db.prepare(`
    SELECT * FROM clientes WHERE id = ? AND deleted_at IS NULL
  `).get(id)

  if (!cliente) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  const obras = db.prepare(`
    SELECT
      o.*,
      COALESCE(SUM(i.monto), 0) AS total_cobrado,
      COUNT(DISTINCT a.id)       AS adicionales_pendientes
    FROM obras o
    LEFT JOIN ingresos i ON i.obra_id = o.id AND i.deleted_at IS NULL
    LEFT JOIN adicionales a ON a.obra_id = o.id AND a.estado = 'pendiente' AND a.deleted_at IS NULL
    WHERE o.cliente_id = ? AND o.deleted_at IS NULL
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all(id)

  return NextResponse.json({ ...cliente as object, obras })
}

// PUT /api/clientes/[id] — edita datos del cliente
export async function PUT(req: NextRequest, { params }: Params) {
  const id = Number(params.id)
  const body = await req.json()
  const { nombre, telefono, email } = body

  if (!nombre?.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }

  const exists = db.prepare('SELECT id FROM clientes WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  db.prepare(`
    UPDATE clientes SET nombre = ?, telefono = ?, email = ? WHERE id = ?
  `).run(nombre.trim(), telefono?.trim() || null, email?.trim() || null, id)

  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id)
  return NextResponse.json(cliente)
}

// DELETE /api/clientes/[id] — soft delete (mueve a papelera)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const id = Number(params.id)

  const exists = db.prepare('SELECT id FROM clientes WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  db.prepare(`
    UPDATE clientes SET deleted_at = datetime('now','localtime') WHERE id = ?
  `).run(id)

  return NextResponse.json({ ok: true })
}
