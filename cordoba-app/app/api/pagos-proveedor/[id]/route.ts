import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

type Params = { params: { id: string } }

// DELETE /api/pagos-proveedor/[id] — soft delete
export async function DELETE(_req: NextRequest, { params }: Params) {
  const id = Number(params.id)
  const exists = db.prepare('SELECT id FROM pagos_proveedor WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })

  db.prepare(`UPDATE pagos_proveedor SET deleted_at = datetime('now','localtime') WHERE id = ?`).run(id)
  return NextResponse.json({ ok: true })
}
