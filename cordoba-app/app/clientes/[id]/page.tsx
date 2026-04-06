export default function FichaCliente({ params }: { params: { id: string } }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <p className="text-gray-400">Ficha del cliente {params.id} — en construcción...</p>
    </div>
  )
}
