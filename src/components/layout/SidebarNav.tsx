import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { navSections } from './navigation'

/** Shared navigation list used by the desktop sidebar and the mobile drawer. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-6">
      {navSections.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-navy-300 uppercase">
            {section.title}
          </p>
          <ul className="flex flex-col gap-0.5">
            {section.items.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sage-400/20 text-cream-50'
                        : 'text-navy-200 hover:bg-white/5 hover:text-cream-50',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn(
                          'size-[18px] shrink-0',
                          isActive ? 'text-sage-300' : 'text-navy-300 group-hover:text-cream-100',
                        )}
                        aria-hidden
                      />
                      <span className="flex-1">{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
