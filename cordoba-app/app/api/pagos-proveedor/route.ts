import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET /api/pagos-proveedor?proveedor_id=1
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const proveedorId = searchParams.get('proveedor_id')

  let sql = `
    SELECT
      pp.*,
      p.nombre  AS proveedor_nombre,
      cp.descripcion AS compra_descripcion
    FROM pagos_proveedor pp
    JOIN proveedores p ON p.id = pp.proveedor_id
    LEFT JOIN compras_proveedor cp ON cp.id = pp.compra_id
    WHERE pp.deleted_at IS NULL
  `
  const args: number[] = []

  if (proveedorId) { sql += ' AND pp.proveedor_id = ?'; args.push(Number(proveedorId)) }

  sql += ' ORDER BY pp.fecha DESC'

  const pagos = db.prepare(sql).all(...args)
  return NextResponse.json(pagos)
}

// POST /api/pagos-proveedor — registra un pago
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { proveedor_id, compra_id, monto, fecha, observaciones } = body

  if (!proveedor_id || !monto || !fecha) {
    return NextResponse.json({ error: 'proveedor_id, monto y fecha son obligatorios' }, { status: 400 })
  }

  const provExiste = db.prepare('SELECT id FROM proveedores WHERE id = ? AND deleted_at IS NULL').get(Number(proveedor_id))
  if (!provExiste) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })

  const result = db.prepare(`
    INSERT INTO pagos_proveedor (proveedor_id, compra_id, monto, fecha, observaciones)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    Number(proveedor_id),
    compra_id ? Number(compra_id) : null,
    Number(monto),
    fecha,
    observaciones?.trim() || null
  )

  // Si el pago cubre el total de la compra, marcarla como pagada
  if (compra_id) {
    const compra = db.prepare(`
      SELECT monto_total,
        (SELECT COALESCE(SUM(monto),0) FROM pagos_proveedor
         WHERE compra_id = ? AND deleted_at IS NULL) AS pagado
      FROM compras_proveedor WHERE id = ?
    `).get(Number(compra_id), Number(compra_id)) as { monto_total: number; pagado: number } | undefined

    if (compra && compra.pagado >= compra.monto_total) {
      db.prepare(`UPDATE compras_proveedor SET estado_pago = 'pagado' WHERE id = ?`).run(Number(compra_id))
    }
  }

  const pago = db.prepare(`
    SELECT pp.*, p.nombre AS proveedor_nombre
    FROM pagos_proveedor pp
    JOIN proveedores p ON p.id = pp.proveedor_id
    WHERE pp.id = ?
  `).get(result.lastInsertRowid)

  return NextResponse.json(pago, { status: 201 })
}
