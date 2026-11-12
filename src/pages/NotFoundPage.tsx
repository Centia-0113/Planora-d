import { Link } from 'react-router-dom'
import { Logo, buttonClasses } from '@/components/ui'

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
      <Logo />
      <p className="mt-10 font-heading text-6xl font-extrabold text-sage-500">404</p>
      <h1 className="mt-3 text-2xl font-extrabold">We couldn’t find that page</h1>
      <p className="mt-2 text-navy-500">The link may be broken, or the page may have moved.</p>
      <Link to="/" className={buttonClasses('primary', 'md', 'mt-8')}>
        Go to the homepage
      </Link>
    </div>
  )
}
