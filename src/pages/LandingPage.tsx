import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckSquare,
  FileText,
  FolderKanban,
  ListChecks,
  Lock,
  Sparkles,
} from 'lucide-react'
import { Logo, buttonClasses } from '@/components/ui'
import { useAuth } from '@/features/auth/auth-context'

const features = [
  {
    icon: CheckSquare,
    title: 'Task management',
    text: 'Capture every responsibility with priorities, categories, due dates and subtasks.',
  },
  {
    icon: FolderKanban,
    title: 'Projects & milestones',
    text: 'Group related work into projects and see progress toward each milestone.',
  },
  {
    icon: CalendarDays,
    title: 'Monthly planner',
    text: 'A calendar view of events, task deadlines and project milestones together.',
  },
  {
    icon: ListChecks,
    title: 'Daily checklist',
    text: 'Keep track of the activities that need your attention today.',
  },
  {
    icon: FileText,
    title: 'Document library',
    text: 'Store project briefs and task descriptions securely alongside your work.',
  },
  {
    icon: Sparkles,
    title: 'AI project planning',
    text: 'Turn an uploaded document into a proposed plan and timeline that you review and approve.',
  },
  {
    icon: BarChart3,
    title: 'Progress analytics',
    text: 'See completed versus outstanding work and your weekly productivity patterns.',
  },
  {
    icon: Bell,
    title: 'Smart reminders',
    text: 'Get notified about upcoming deadlines before they sneak up on you.',
  },
]

const steps = [
  {
    n: '1',
    title: 'Create your account',
    text: 'You get a private workspace that only you can see.',
  },
  {
    n: '2',
    title: 'Plan your work',
    text: 'Add tasks and projects, or let AI draft a plan from a document.',
  },
  {
    n: '3',
    title: 'Track your progress',
    text: 'Tick things off daily and watch your progress grow.',
  },
]

export function LandingPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-svh bg-cream-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" aria-label="Planora home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-2" aria-label="Account">
          {user ? (
            <Link to="/dashboard" className={buttonClasses('primary', 'sm')}>
              Open dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className={buttonClasses('ghost', 'sm')}>
                Sign in
              </Link>
              <Link to="/register" className={buttonClasses('primary', 'sm')}>
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-2 lg:pt-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-sage-100 px-3 py-1 text-xs font-semibold text-sage-800">
              <Sparkles className="size-3.5" aria-hidden /> Planning, with AI that you stay in
              control of
            </p>
            <h1 className="mt-6 text-4xl leading-[1.1] font-extrabold sm:text-5xl lg:text-6xl">
              Your Life. Your Goals. <span className="text-sage-600">Your Progress.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-navy-600">
              Planora brings your tasks, projects, monthly plans and daily routines into one calm,
              private workspace, so you always know what to do next.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={user ? '/dashboard' : '/register'}
                className={buttonClasses('primary', 'lg')}
              >
                {user ? 'Go to your dashboard' : 'Create your free account'}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              {!user && (
                <Link to="/login" className={buttonClasses('secondary', 'lg')}>
                  I already have an account
                </Link>
              )}
            </div>
          </div>

          <HeroPreview />
        </section>

        {/* Purpose */}
        <section className="bg-navy-900 py-20 text-cream-50">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-extrabold text-cream-50 sm:text-4xl">
              One place for everything you’re working toward
            </h2>
            <p className="mt-5 text-lg text-navy-100">
              Assignments, work projects, personal goals and daily routines usually live in
              different apps, notebooks and inboxes. Planora connects them, so planning a month,
              running a project and getting through today all happen in the same workspace.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="features-title">
          <h2 id="features-title" className="text-center text-3xl font-extrabold sm:text-4xl">
            Everything you need to plan, manage and achieve
          </h2>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="rounded-card border border-cream-300 bg-white p-6 shadow-card"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-sage-100 text-sage-700">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-base font-bold">{title}</h3>
                <p className="mt-2 text-sm text-navy-600">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section className="border-y border-cream-300 bg-cream-50 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-extrabold sm:text-4xl">How it works</h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-3">
              {steps.map((s) => (
                <li key={s.n} className="text-center">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-navy-800 font-heading text-lg font-extrabold text-cream-50">
                    {s.n}
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                  <p className="mt-2 text-navy-600">{s.text}</p>
                </li>
              ))}
            </ol>
            <p className="mx-auto mt-14 flex max-w-xl items-start justify-center gap-2 text-center text-sm text-navy-600">
              <Lock className="mt-0.5 size-4 shrink-0 text-sage-600" aria-hidden />
              Your data is isolated per workspace with database-level security. Nobody else can read
              your tasks or documents.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="rounded-3xl bg-sage-600 px-6 py-14 text-center text-white sm:px-12">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Start planning with clarity
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sage-50">
              Set up your private workspace in under a minute.
            </p>
            <Link
              to={user ? '/dashboard' : '/register'}
              className={buttonClasses('primary', 'lg', 'mt-8')}
            >
              {user ? 'Open Planora' : 'Get started'}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-navy-950 text-navy-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo light />
            <p className="mt-3 text-sm">Your Life. Your Goals. Your Progress.</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <Link to="/register" className="hover:text-cream-50">
              Create account
            </Link>
            <Link to="/login" className="hover:text-cream-50">
              Sign in
            </Link>
            <a href="#features-title" className="hover:text-cream-50">
              Features
            </a>
            <Link to="/forgot-password" className="hover:text-cream-50">
              Reset password
            </Link>
            <Link to="/privacy" className="hover:text-cream-50">
              Privacy policy
            </Link>
            <Link to="/terms" className="hover:text-cream-50">
              Terms of service
            </Link>
          </nav>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-navy-300 sm:px-6">
            © {new Date().getFullYear()} Planora. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

/** Decorative product preview, built from real UI pieces rather than a screenshot. */
function HeroPreview() {
  const rows = [
    { title: 'Draft research proposal', tag: 'Academic', done: true },
    { title: 'Review sprint backlog', tag: 'Professional', done: true },
    { title: 'Book dentist appointment', tag: 'Personal', done: false },
    { title: 'Submit project milestone 2', tag: 'Projects', done: false },
  ]
  return (
    <div aria-hidden className="relative">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-sage-200/50 blur-2xl" />
      <div className="rounded-3xl border border-cream-300 bg-white p-5 shadow-card sm:p-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Today', '4'],
            ['Completed', '12'],
            ['Projects', '3'],
          ].map(([label, value], i) => (
            <div
              key={label}
              className={
                i === 0
                  ? 'rounded-2xl bg-navy-800 p-4 text-cream-50'
                  : 'rounded-2xl bg-cream-100 p-4'
              }
            >
              <p className={i === 0 ? 'text-xs text-navy-200' : 'text-xs text-navy-500'}>{label}</p>
              <p className="mt-1 font-heading text-2xl font-extrabold">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-cream-200 p-4">
          <div className="flex items-center justify-between">
            <p className="font-heading text-sm font-bold">Daily checklist</p>
            <p className="text-xs font-semibold text-sage-700">50% done</p>
          </div>
          <div className="mt-2 h-2 rounded-full bg-cream-200">
            <div className="h-2 w-1/2 rounded-full bg-sage-500" />
          </div>
          <ul className="mt-4 space-y-2.5">
            {rows.map((r) => (
              <li key={r.title} className="flex items-center gap-3 text-sm">
                <span
                  className={
                    r.done
                      ? 'flex size-5 items-center justify-center rounded-md bg-sage-500 text-white'
                      : 'size-5 rounded-md border-2 border-navy-200'
                  }
                >
                  {r.done && <CheckSquare className="size-3.5" />}
                </span>
                <span className={r.done ? 'flex-1 text-navy-400 line-through' : 'flex-1'}>
                  {r.title}
                </span>
                <span className="rounded-full bg-cream-200 px-2 py-0.5 text-[10px] font-semibold text-navy-600">
                  {r.tag}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
