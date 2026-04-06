'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/clientes', label: 'Clientes' },
  { href: '/finanzas', label: 'Finanzas' },
  { href: '/empleados', label: 'Empleados' },
  { href: '/proveedores', label: 'Proveedores' },
  { href: '/materiales', label: 'Materiales' },
  { href: '/presupuestos', label: 'Presupuestos' },
  { href: '/reportes', label: 'Reportes' },
  { href: '/papelera', label: 'Papelera' },
  { href: '/configuracion', label: 'Configuración' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 min-h-screen bg-[#1a1a2e] text-white flex flex-col flex-shrink-0">
      <div className="px-6 py-5 border-b border-white/10">
        <h1 className="text-xl font-bold tracking-wide">CÓRDOBA</h1>
        <p className="text-xs text-white/50 mt-0.5">Gestión de obras</p>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-6 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
