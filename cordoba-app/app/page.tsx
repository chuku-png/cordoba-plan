export default function Dashboard() {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Resumen general</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Ingresos del mes', value: '—' },
          { label: 'Gastos del mes', value: '—' },
          { label: 'Obras activas', value: '—' },
          { label: 'A pagar esta semana', value: '—' },
          { label: 'Deuda proveedores', value: '—' },
          { label: 'Adicionales pendientes', value: '—' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-lg p-5 border border-gray-200">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
