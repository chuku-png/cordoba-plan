import { NextResponse } from 'next/server'
import { crearBackup, listarBackups } from '@/lib/backup'

// GET /api/backup — lista los backups existentes
export async function GET() {
  try {
    const backups = listarBackups()
    return NextResponse.json(backups)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST /api/backup — crea un backup manual
export async function POST() {
  try {
    const ruta = crearBackup()
    return NextResponse.json({ ok: true, ruta })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
