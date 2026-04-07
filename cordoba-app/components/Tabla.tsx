interface Columna<T> {
  header: string
  accessor?: keyof T
  render?: (row: T) => React.ReactNode
  className?: string
}

interface Props<T> {
  columnas: Columna<T>[]
  datos: T[]
  vacio?: string
}

export default function Tabla<T extends { id: number }>({
  columnas,
  datos,
  vacio = 'No hay registros.',
}: Props<T>) {
  if (datos.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
        {vacio}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columnas.map((col, i) => (
              <th
                key={i}
                className={`text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {datos.map((row) => (
            <tr key={row.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
              {columnas.map((col, i) => (
                <td key={i} className={`px-4 py-3 text-gray-700 ${col.className ?? ''}`}>
                  {col.render
                    ? col.render(row)
                    : col.accessor
                    ? String(row[col.accessor] ?? '—')
                    : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
