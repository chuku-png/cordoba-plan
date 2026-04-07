import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET /api/adicionales?obra_id=1
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const obraId = searchParams.get('obra_id')

  let sql = `
    SELECT
      a.*,
      o.nombre AS obra_nombre,
      p.nombre AS proveedor_nombre,
      (a.monto_mano_obra + a.monto_material) AS monto_total
    FROM adicionales a
    JOIN obras o ON o.id = a.obra_id
    LEFT JOIN proveedores p ON p.id = a.proveedor_id
    WHERE a.deleted_at IS NULL
  `
  const args: number[] = []

  if (obraId) {
    sql += ' AND a.obra_id = ?'
    args.push(Number(obraId))
  }

  sql += ' ORDER BY a.fecha DESC, a.created_at DESC'

  const adicionales = db.prepare(sql).all(...args)
  return NextResponse.json(adicionales)
}

// POST /api/adicionales — registra un adicional
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { obra_id, proveedor_id, descripcion, monto_mano_obra, monto_material, fecha } = body

  if (!obra_id || !descripcion?.trim()) {
    return NextResponse.json({ error: 'obra_id y descripcion son obligatorios' }, { status: 400 })
  }

  const obraExiste = db.prepare('SELECT id FROM obras WHERE id = ? AND deleted_at IS NULL').get(Number(obra_id))
  if (!obraExiste) {
    return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 })
  }

  const result = db.prepare(`
    INSERT INTO adicionales (obra_id, proveedor_id, descripcion, monto_mano_obra, monto_material, fecha)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    Number(obra_id),
    proveedor_id ? Number(proveedor_id) : null,
    descripcion.trim(),
    monto_mano_obra || 0,
    monto_material || 0,
    fecha || null
  )

  const adicional = db.prepare('SELECT * FROM adicionales WHERE id = ?').get(result.lastInsertRowid)
  return NextResponse.json(adicional, { status: 201 })
}
