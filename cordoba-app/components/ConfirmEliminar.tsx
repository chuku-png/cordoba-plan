'use client'

import Modal from './Modal'

interface Props {
  mensaje?: string
  onConfirmar: () => void
  onCancelar: () => void
  cargando?: boolean
}

export default function ConfirmEliminar({
  mensaje = '¿Estás seguro? El registro se moverá a la papelera.',
  onConfirmar,
  onCancelar,
  cargando = false,
}: Props) {
  return (
    <Modal titulo="Confirmar eliminación" onClose={onCancelar} ancho="max-w-sm">
      <p className="text-gray-600 text-sm mb-6">{mensaje}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancelar}
          className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirmar}
          disabled={cargando}
          className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {cargando ? 'Eliminando...' : 'Mover a papelera'}
        </button>
      </div>
    </Modal>
  )
}
