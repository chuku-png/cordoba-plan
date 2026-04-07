import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

type Params = { params: { id: string } }

// PUT /api/gastos-fijos/[id] — edita o marca como pagado
export async function PUT(req: NextRequest, { params }: Params) {
  const id = Number(params.id)
  const body = await req.json()
  const { concepto, mes, anio, monto, estado, fecha_pago } = body

  const exists = db.prepare('SELECT id FROM gastos_fijos WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })

  const campos: string[] = []
  const valores: (string | number | null)[] = []

  if (concepto   !== undefined) { campos.push('concepto = ?');   valores.push(concepto.trim()) }
  if (mes        !== undefined) { campos.push('mes = ?');        valores.push(Number(mes)) }
  if (anio       !== undefined) { campos.push('anio = ?');       valores.push(Number(anio)) }
  if (monto      !== undefined) { campos.push('monto = ?');      valores.push(Number(monto)) }
  if (estado     !== undefined) { campos.push('estado = ?');     valores.push(estado) }
  if (fecha_pago !== undefined) { campos.push('fecha_pago = ?'); valores.push(fecha_pago || null) }

  // Si se marca como pagado sin fecha, poner hoy
  if (estado === 'pagado' && fecha_pago === undefined) {
    const yaFecha = campos.includes('fecha_pago = ?')
    if (!yaFecha) {
      campos.push('fecha_pago = ?')
      valores.push(new Date().toISOString().slice(0, 10))
    }
  }

  if (campos.length === 0) return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })

  valores.push(id)
  db.prepare(`UPDATE gastos_fijos SET ${campos.join(', ')} WHERE id = ?`).run(...valores)

  const gasto = db.prepare('SELECT * FROM gastos_fijos WHERE id = ?').get(id)
  return NextResponse.json(gasto)
}

// DELETE /api/gastos-fijos/[id] — soft delete
export async function DELETE(_req: NextRequest, { params }: Params) {
  const id = Number(params.id)
  const exists = db.prepare('SELECT id FROM gastos_fijos WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })

  db.prepare(`UPDATE gastos_fijos SET deleted_at = datetime('now','localtime') WHERE id = ?`).run(id)
  return NextResponse.json({ ok: true })
}
