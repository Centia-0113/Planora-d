import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { Logo } from '@/components/ui'
import { useAuth } from '@/features/auth/auth-context'
import { NotificationBell } from '@/features/notifications/components/NotificationBell'
import { useProfile } from '@/features/workspace/queries'
import { WorkspaceProvider } from '@/features/workspace/WorkspaceProvider'
import { findNavItem } from './navigation'
import { SidebarNav } from './SidebarNav'

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const current = findNavItem(location.pathname)

  useEffect(() => {
    document.title = current ? `${current.label} · Planora` : 'Planora'
  }, [current])

  return (
    <div className="min-h-svh lg:pl-64">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy-900 px-4 py-6 lg:flex">
        <Link to="/dashboard" className="mb-8 px-2" aria-label="Planora dashboard">
          <Logo light />
        </Link>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-navy-900 px-4 py-6 shadow-xl">
            <div className="mb-8 flex items-center justify-between px-2">
              <Logo light />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-2 text-navy-200 hover:bg-white/10"
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav onNavigate={() => setDrawerOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      <WorkspaceProvider>
        <Header title={current?.label ?? 'Planora'} onOpenMenu={() => setDrawerOpen(true)} />

        <main id="main" className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <Outlet />
        </main>
      </WorkspaceProvider>
    </div>
  )
}

function Header({ title, onOpenMenu }: { title: string; onOpenMenu: () => void }) {
  const { user, signOut } = useAuth()
  const { data: profile } = useProfile()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const displayName = profile?.full_name || user?.email || 'Account'
  const initials = displayName
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')

  useEffect(() => {
    if (!menuOpen) return
    const onPointer = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-cream-300 bg-cream-100/90 px-4 backdrop-blur sm:px-6 lg:px-10">
      <button
        type="button"
        onClick={onOpenMenu}
        className="-ml-2 rounded-lg p-2 text-navy-700 hover:bg-navy-50 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>
      <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>

      <NotificationBell />
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`Account menu: ${displayName}`}
          className="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-navy-50"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-sage-500 text-xs font-bold text-white">
            {initials}
          </span>
          <span className="hidden max-w-40 truncate text-sm font-medium text-navy-800 sm:block">
            {displayName}
          </span>
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-cream-300 bg-white shadow-card"
          >
            <div className="border-b border-cream-200 px-4 py-3">
              <p className="truncate text-sm font-semibold">{profile?.full_name || 'Signed in'}</p>
              <p className="truncate text-xs text-navy-500">{user?.email}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => void signOut()}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-navy-700 hover:bg-cream-50"
            >
              <LogOut className="size-4" aria-hidden />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
