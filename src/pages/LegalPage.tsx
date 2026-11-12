import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui'

const UPDATED = '12 November 2026'

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-svh bg-cream-100">
      <header className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <Link to="/" aria-label="Planora home">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <article className="rounded-card border border-cream-300 bg-white p-6 shadow-card sm:p-10">
          <h1 className="text-3xl font-extrabold">{title}</h1>
          <p className="mt-1 text-sm text-navy-500">Last updated {UPDATED}</p>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-navy-700 [&_h2]:mt-8 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-navy-900 [&_li]:ml-5 [&_li]:list-disc">
            {children}
          </div>
          <p className="mt-10 rounded-xl bg-amber-50 p-4 text-xs text-amber-900">
            Template notice: this document is a starting point written for Planora’s architecture.
            Have it reviewed for your jurisdiction (for example, POPIA in South Africa or GDPR in
            the EU) before a public launch.
          </p>
        </article>
      </main>
    </div>
  )
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        Planora helps you plan tasks, projects and daily activities. This policy explains what
        information we process, why, and the choices you have.
      </p>
      <h2>Information we collect</h2>
      <ul>
        <li>Account details: your name, email address and timezone.</li>
        <li>
          Content you create: tasks, subtasks, projects, milestones, calendar events, checklist
          items and reminders.
        </li>
        <li>Documents you upload and the text extracted from them.</li>
        <li>Notification records and your notification preferences.</li>
        <li>Basic technical logs needed to operate and secure the service.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To provide the service: storing your content and showing it back to you.</li>
        <li>To send reminders and notifications you have enabled.</li>
        <li>To generate AI project plans when you ask us to.</li>
        <li>To keep the service secure and fix problems.</li>
      </ul>
      <p>
        We do not sell your personal information and we do not use your content for advertising.
      </p>
      <h2>AI processing</h2>
      <p>
        When you choose <strong>Generate plan</strong>, the text of that document is sent to our AI
        provider, Anthropic, solely to produce the proposed plan. Nothing is added to your workspace
        until you approve it. Avoid uploading documents you are not permitted to share with a
        processor.
      </p>
      <h2>Where your data is stored</h2>
      <p>
        Your data is stored with our infrastructure provider, Supabase. Each workspace is isolated
        with database-level access rules, and documents are kept in private storage that is only
        reachable through short-lived signed links.
      </p>
      <h2>Retention and deletion</h2>
      <p>
        We keep your content for as long as your account exists. You can delete individual items at
        any time, and you can permanently delete your account from{' '}
        <strong>Settings → Account</strong>, which removes your workspace, content and uploaded
        files. Backups are overwritten on a rolling basis.
      </p>
      <h2>Your rights</h2>
      <p>
        You may request access to, correction of, or deletion of your personal information, and you
        may object to processing. Contact the Planora team to make a request.
      </p>
    </LegalLayout>
  )
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p>By creating an account or using Planora you agree to these terms.</p>
      <h2>Your account</h2>
      <p>
        You are responsible for keeping your login details secure and for activity in your account.
        Provide accurate information and keep it up to date.
      </p>
      <h2>Your content</h2>
      <p>
        You keep ownership of the content you create and upload. You give us permission to store and
        process it only as needed to run the service, including AI processing you request.
      </p>
      <h2>Acceptable use</h2>
      <ul>
        <li>Do not upload content you do not have the right to use.</li>
        <li>Do not attempt to access other users’ data or interfere with the service.</li>
        <li>Do not use the service for unlawful purposes.</li>
      </ul>
      <h2>AI-generated plans</h2>
      <p>
        AI-generated plans are suggestions. Dates the AI proposes are labelled as suggestions and
        may be wrong; review every plan before approving it. You remain responsible for your
        schedule and deadlines.
      </p>
      <h2>Availability</h2>
      <p>
        We aim to keep Planora available and your data safe, but the service is provided “as is”
        without guarantees. Reminders depend on scheduled processing and email delivery, which can
        be delayed.
      </p>
      <h2>Ending your use</h2>
      <p>
        You can delete your account at any time from Settings. We may suspend accounts that break
        these terms.
      </p>
    </LegalLayout>
  )
}
