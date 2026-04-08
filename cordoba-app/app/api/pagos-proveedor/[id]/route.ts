import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

type Params = { params: { id: string } }

// DELETE /api/pagos-proveedor/[id] — soft delete y recalcula estado_pago de la compra
export async function DELETE(_req: NextRequest, { params }: Params) {
  const id = Number(params.id)
  const pago = db.prepare('SELECT id, compra_id FROM pagos_proveedor WHERE id = ? AND deleted_at IS NULL').get(id) as { id: number; compra_id: number | null } | undefined
  if (!pago) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })

  db.prepare(`UPDATE pagos_proveedor SET deleted_at = datetime('now','localtime') WHERE id = ?`).run(id)

  // Recalcular estado_pago de la compra asociada
  if (pago.compra_id) {
    const compra = db.prepare(`
      SELECT monto_total,
        (SELECT COALESCE(SUM(monto),0) FROM pagos_proveedor WHERE compra_id = ? AND deleted_at IS NULL) AS pagado
      FROM compras_proveedor WHERE id = ?
    `).get(pago.compra_id, pago.compra_id) as { monto_total: number; pagado: number } | undefined

    if (compra) {
      const nuevoEstado = compra.pagado >= compra.monto_total ? 'pagado' : compra.pagado > 0 ? 'parcial' : 'pendiente'
      db.prepare(`UPDATE compras_proveedor SET estado_pago = ? WHERE id = ?`).run(nuevoEstado, pago.compra_id)
    }
  }

  return NextResponse.json({ ok: true })
}
