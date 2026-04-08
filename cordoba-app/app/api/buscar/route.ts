import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json([])

  const like = `%${q}%`

  const clientes = db.prepare(`
    SELECT 'cliente' AS tipo, id, nombre AS titulo, NULL AS subtitulo, '/clientes/' || id AS href
    FROM clientes WHERE deleted_at IS NULL AND nombre LIKE ? LIMIT 5
  `).all(like)

  const obras = db.prepare(`
    SELECT 'obra' AS tipo, o.id, o.nombre AS titulo, c.nombre AS subtitulo, '/clientes/' || o.cliente_id AS href
    FROM obras o
    LEFT JOIN clientes c ON c.id = o.cliente_id
    WHERE o.deleted_at IS NULL AND (o.nombre LIKE ? OR c.nombre LIKE ?) LIMIT 5
  `).all(like, like)

  const proveedores = db.prepare(`
    SELECT 'proveedor' AS tipo, id, nombre AS titulo, NULL AS subtitulo, '/proveedores' AS href
    FROM proveedores WHERE deleted_at IS NULL AND nombre LIKE ? LIMIT 5
  `).all(like)

  const materiales = db.prepare(`
    SELECT 'material' AS tipo, cp.id, cp.descripcion AS titulo,
      p.nombre || COALESCE(' — ' || o.nombre, '') AS subtitulo,
      '/materiales' AS href
    FROM compras_proveedor cp
    JOIN proveedores p ON p.id = cp.proveedor_id
    LEFT JOIN obras o ON o.id = cp.obra_id
    LEFT JOIN clientes c ON c.id = o.cliente_id
    WHERE cp.deleted_at IS NULL
      AND (cp.descripcion LIKE ? OR p.nombre LIKE ? OR o.nombre LIKE ? OR c.nombre LIKE ?)
    LIMIT 5
  `).all(like, like, like, like)

  const pagos = db.prepare(`
    SELECT 'pago_proveedor' AS tipo, pp.id,
      'Pago a ' || p.nombre AS titulo,
      '$' || CAST(CAST(pp.monto AS INTEGER) AS TEXT) || ' — ' || pp.fecha AS subtitulo,
      '/proveedores' AS href
    FROM pagos_proveedor pp
    JOIN proveedores p ON p.id = pp.proveedor_id
    WHERE pp.deleted_at IS NULL AND p.nombre LIKE ? LIMIT 5
  `).all(like)

  const ingresos = db.prepare(`
    SELECT 'ingreso' AS tipo, i.id,
      'Cobro: ' || i.tipo AS titulo,
      '$' || CAST(CAST(i.monto AS INTEGER) AS TEXT) || COALESCE(' — ' || c.nombre, '') AS subtitulo,
      '/finanzas' AS href
    FROM ingresos i
    LEFT JOIN clientes c ON c.id = i.cliente_id
    WHERE i.deleted_at IS NULL AND (c.nombre LIKE ? OR (i.cliente_id IS NULL AND i.tipo LIKE ?)) LIMIT 5
  `).all(like, like)

  const presupuestos = db.prepare(`
    SELECT 'presupuesto' AS tipo, pr.id,
      'Presupuesto — ' || o.nombre AS titulo,
      c.nombre || ' — ' || pr.estado AS subtitulo,
      '/presupuestos' AS href
    FROM presupuestos pr
    JOIN obras o ON o.id = pr.obra_id
    JOIN clientes c ON c.id = o.cliente_id
    WHERE pr.deleted_at IS NULL AND (c.nombre LIKE ? OR o.nombre LIKE ?) LIMIT 5
  `).all(like, like)

  const resultados = [
    ...clientes, ...obras, ...proveedores,
    ...materiales, ...pagos, ...ingresos, ...presupuestos,
  ]

  return NextResponse.json(resultados)
}
