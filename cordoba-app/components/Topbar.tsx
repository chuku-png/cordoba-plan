'use client'

import { usePathname } from 'next/navigation'

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/clientes': 'Clientes',
  '/finanzas': 'Finanzas',
  '/empleados': 'Empleados',
  '/proveedores': 'Proveedores',
  '/materiales': 'Materiales',
  '/presupuestos': 'Presupuestos',
  '/reportes': 'Reportes',
  '/papelera': 'Papelera',
  '/configuracion': 'Configuración',
}

function getTitle(pathname: string): string {
  if (pathname.startsWith('/clientes/')) return 'Ficha de cliente'
  return titles[pathname] ?? 'Córdoba'
}

export default function Topbar() {
  const pathname = usePathname()
  const title = getTitle(pathname)

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6">
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
    </header>
  )
}
