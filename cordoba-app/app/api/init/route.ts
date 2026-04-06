import { NextResponse } from 'next/server'
import { initDB } from '@/lib/schema'

export async function GET() {
  try {
    initDB()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
