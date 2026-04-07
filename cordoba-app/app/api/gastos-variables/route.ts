import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET /api/gastos-variables?mes=4&anio=2026&categoria=Transporte
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const mes       = searchParams.get('mes')
  const anio      = searchParams.get('anio')
  const categoria = searchParams.get('categoria')

  let sql = `SELECT * FROM gastos_variables WHERE deleted_at IS NULL`
  const args: (string | number)[] = []

  if (mes && anio) {
    sql += ` AND strftime('%m', fecha) = ? AND strftime('%Y', fecha) = ?`
    args.push(String(mes).padStart(2, '0'), String(anio))
  }
  if (categoria) { sql += ' AND categoria = ?'; args.push(categoria) }

  sql += ' ORDER BY fecha DESC, created_at DESC'

  const gastos = db.prepare(sql).all(...args)
  return NextResponse.json(gastos)
}

// POST /api/gastos-variables
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { concepto, categoria, monto, fecha, observaciones } = body

  if (!concepto?.trim() || !monto || !fecha) {
    return NextResponse.json({ error: 'concepto, monto y fecha son obligatorios' }, { status: 400 })
  }

  const result = db.prepare(`
    INSERT INTO gastos_variables (concepto, categoria, monto, fecha, observaciones)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    concepto.trim(),
    categoria?.trim() || 'Varios',
    Number(monto),
    fecha,
    observaciones?.trim() || null
  )

  const gasto = db.prepare('SELECT * FROM gastos_variables WHERE id = ?').get(result.lastInsertRowid)
  return NextResponse.json(gasto, { status: 201 })
}
