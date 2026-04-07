import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET /api/gastos-fijos?mes=4&anio=2026
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const mes  = searchParams.get('mes')
  const anio = searchParams.get('anio')

  let sql = `SELECT * FROM gastos_fijos WHERE deleted_at IS NULL`
  const args: (string | number)[] = []

  if (mes)  { sql += ' AND mes = ?';  args.push(Number(mes)) }
  if (anio) { sql += ' AND anio = ?'; args.push(Number(anio)) }

  sql += ' ORDER BY concepto ASC'

  const gastos = db.prepare(sql).all(...args)
  return NextResponse.json(gastos)
}

// POST /api/gastos-fijos
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { concepto, mes, anio, monto } = body

  if (!concepto?.trim() || !mes || !anio || !monto) {
    return NextResponse.json({ error: 'concepto, mes, anio y monto son obligatorios' }, { status: 400 })
  }

  const result = db.prepare(`
    INSERT INTO gastos_fijos (concepto, mes, anio, monto)
    VALUES (?, ?, ?, ?)
  `).run(concepto.trim(), Number(mes), Number(anio), Number(monto))

  const gasto = db.prepare('SELECT * FROM gastos_fijos WHERE id = ?').get(result.lastInsertRowid)
  return NextResponse.json(gasto, { status: 201 })
}
