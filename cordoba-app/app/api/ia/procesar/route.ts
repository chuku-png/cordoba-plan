import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { procesarExcelMateriales, procesarPDFPresupuesto } from '@/lib/ia'

// POST /api/ia/procesar — recibe un archivo multipart y devuelve JSON extraído
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('archivo') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Se requiere un archivo (campo: archivo)' }, { status: 400 })
    }

    const nombre = file.name.toLowerCase()
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // ── Detectar tipo ──────────────────────────────────────────────
    let tipo: 'excel' | 'pdf' | null = null
    if (nombre.endsWith('.xlsx') || nombre.endsWith('.xls') || nombre.endsWith('.ods')) {
      tipo = 'excel'
    } else if (nombre.endsWith('.pdf')) {
      tipo = 'pdf'
    }

    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de archivo no soportado. Usá .xlsx, .xls o .pdf' }, { status: 400 })
    }

    // ── Excel → materiales ──────────────────────────────────────────────
    if (tipo === 'excel') {
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      let textoExcel = ''

      for (const sheetName of workbook.SheetNames) {
        const ws = workbook.Sheets[sheetName]
        const csv = XLSX.utils.sheet_to_csv(ws)
        textoExcel += `\n=== Hoja: ${sheetName} ===\n${csv}\n`
      }

      const resumen = await procesarExcelMateriales(textoExcel)
      return NextResponse.json({
        tipo: 'materiales',
        archivo: file.name,
        resumen,
      })
    }

    // ── PDF → presupuesto ──────────────────────────────────────────────
    if (tipo === 'pdf') {
      // Importación dinámica para evitar problemas de SSR con pdf-parse
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string; numpages: number }>
      const data = await pdfParse(buffer)
      const textoPDF = data.text

      if (!textoPDF.trim()) {
        return NextResponse.json({ error: 'No se pudo extraer texto del PDF. El archivo puede ser una imagen escaneada.' }, { status: 422 })
      }

      const resumen = await procesarPDFPresupuesto(textoPDF)
      return NextResponse.json({
        tipo: 'presupuesto',
        archivo: file.name,
        paginas: data.numpages,
        resumen,
      })
    }

    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  } catch (err) {
    console.error('Error procesando archivo con IA:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
