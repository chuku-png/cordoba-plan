import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ── Tipos de resultado ────────────────────────────────────────────

export interface ItemMaterial {
  descripcion: string
  cantidad?: number | string
  unidad?: string
  precio_unitario?: number
  total: number
  estado?: 'pagado' | 'pendiente' | 'sin_retirar'
}

export interface ResumenMateriales {
  proveedor?: string
  obra?: string
  fecha?: string
  items: ItemMaterial[]
  total_general: number
  total_pagado?: number
  total_pendiente?: number
  total_sin_retirar?: number
  notas?: string
}

export interface ItemPresupuesto {
  descripcion: string
  cantidad?: number | string
  unidad?: string
  precio_unitario?: number
  subtotal: number
}

export interface ResumenPresupuesto {
  cliente?: string
  obra?: string
  fecha?: string
  descripcion_general?: string
  items: ItemPresupuesto[]
  subtotal?: number
  iva?: number
  total: number
  validez?: string
  notas?: string
}

// ── Procesador Excel de materiales ────────────────────────────────────────────

export async function procesarExcelMateriales(textoExcel: string): Promise<ResumenMateriales> {
  const mensaje = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Analizá el siguiente contenido extraído de una planilla Excel de materiales de construcción y devolvé un JSON con la estructura indicada. El documento puede contener listas de materiales comprados, con precios, cantidades y estados de pago.

CONTENIDO DE LA PLANILLA:
${textoExcel}

Devolvé ÚNICAMENTE un objeto JSON válido con esta estructura (sin markdown, sin explicaciones):
{
  "proveedor": "nombre del proveedor si está mencionado",
  "obra": "nombre de la obra si está mencionado",
  "fecha": "fecha en formato YYYY-MM-DD si está mencionada",
  "items": [
    {
      "descripcion": "descripción del material",
      "cantidad": número o string,
      "unidad": "kg/m2/unidad/etc",
      "precio_unitario": número o null,
      "total": número,
      "estado": "pagado" | "pendiente" | "sin_retirar"
    }
  ],
  "total_general": número total de todos los items,
  "total_pagado": suma de items con estado pagado,
  "total_pendiente": suma de items con estado pendiente,
  "total_sin_retirar": suma de items con estado sin_retirar,
  "notas": "observaciones generales si las hay"
}

Si un campo no está disponible, usá null. Para el estado de cada item, intentá inferirlo del contexto (marcas, columnas, colores mencionados). Si no hay información de estado, usá "pendiente".`,
      },
    ],
  })

  const texto = mensaje.content[0].type === 'text' ? mensaje.content[0].text : ''
  // Limpiar posible markdown
  const limpio = texto.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(limpio) as ResumenMateriales
}

// ── Procesador PDF de presupuesto ────────────────────────────────────────────

export async function procesarPDFPresupuesto(textoPDF: string): Promise<ResumenPresupuesto> {
  const mensaje = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Analizá el siguiente texto extraído de un PDF de presupuesto de construcción y devolvé un JSON con la información estructurada.

CONTENIDO DEL PDF:
${textoPDF}

Devolvé ÚNICAMENTE un objeto JSON válido con esta estructura (sin markdown, sin explicaciones):
{
  "cliente": "nombre del cliente si está mencionado",
  "obra": "descripción de la obra",
  "fecha": "fecha en formato YYYY-MM-DD si está mencionada",
  "descripcion_general": "descripción general del trabajo presupuestado",
  "items": [
    {
      "descripcion": "descripción del rubro o ítem",
      "cantidad": número o string o null,
      "unidad": "unidad de medida o null",
      "precio_unitario": número o null,
      "subtotal": número
    }
  ],
  "subtotal": suma sin IVA o null,
  "iva": monto de IVA o null,
  "total": monto total del presupuesto,
  "validez": "texto sobre validez si está mencionado",
  "notas": "condiciones de pago u observaciones"
}

Si un campo no está disponible, usá null.`,
      },
    ],
  })

  const texto = mensaje.content[0].type === 'text' ? mensaje.content[0].text : ''
  const limpio = texto.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(limpio) as ResumenPresupuesto
}
