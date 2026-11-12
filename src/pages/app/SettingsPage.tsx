import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Bell, Globe, KeyRound, ShieldCheck, User } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Input,
  Modal,
  Select,
  Toggle,
  buttonClasses,
} from '@/components/ui'
import { listTimezones } from '@/lib/dates'
import { errorMessage } from '@/lib/query'
import { validateFullName } from '@/lib/validation'
import { useAuth } from '@/features/auth/auth-context'
import { browserNotificationsSupported } from '@/features/notifications/useBrowserNotifications'
import {
  useDeleteAccount,
  useUpdatePreferences,
  useUpdateProfile,
  type PreferencesInput,
} from '@/features/settings/api'
import { useWorkspace } from '@/features/workspace/workspace-context'

const REMINDER_LEAD_OPTIONS = [
  { value: '0', label: 'At the time' },
  { value: '15', label: '15 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '180', label: '3 hours before' },
  { value: '1440', label: '1 day before' },
  { value: '2880', label: '2 days before' },
]

export function SettingsPage() {
  return (
    <PageContainer title="Settings" description="Manage your profile, notifications and account.">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <ProfileSection />
        <NotificationSection />
        <AccountSection />
      </div>
    </PageContainer>
  )
}

function ProfileSection() {
  const { profile, timezone } = useWorkspace()
  const { user } = useAuth()
  const update = useUpdateProfile()
  const [name, setName] = useState(profile.full_name ?? '')
  const [tz, setTz] = useState(timezone)
  const [error, setError] = useState<string>()
  const [saved, setSaved] = useState(false)
  const timezones = useMemo(() => {
    const list = listTimezones()
    return (list.includes(timezone) ? list : [timezone, ...list]).map((t) => ({
      value: t,
      label: t.replace(/_/g, ' '),
    }))
  }, [timezone])
  const dirty = name !== (profile.full_name ?? '') || tz !== timezone

  return (
    <Card>
      <CardHeader
        title="Profile"
        description="How you appear in Planora."
        action={<User className="size-5 text-navy-400" aria-hidden />}
      />
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          const nameError = validateFullName(name)
          setError(nameError)
          setSaved(false)
          if (nameError) return
          update.mutate(
            { full_name: name.trim(), timezone: tz },
            { onSuccess: () => setSaved(true) },
          )
        }}
      >
        {update.error && <Alert>{errorMessage(update.error)}</Alert>}
        {saved && !dirty && <Alert tone="success">Profile saved.</Alert>}
        <Input
          label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          autoComplete="name"
        />
        <Input
          label="Email"
          value={user?.email ?? ''}
          disabled
          hint="Your sign-in email cannot be changed here."
        />
        <Select
          label="Timezone"
          value={tz}
          onChange={(e) => setTz(e.target.value)}
          options={timezones}
          hint="Used for “today”, due dates, reminders and analytics."
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!dirty}
            loading={update.isPending}
            leftIcon={<Globe className="size-4" aria-hidden />}
          >
            Save profile
          </Button>
        </div>
      </form>
    </Card>
  )
}

function NotificationSection() {
  const { preferences } = useWorkspace()
  const update = useUpdatePreferences()
  const [permission, setPermission] = useState(() =>
    browserNotificationsSupported() ? Notification.permission : 'unsupported',
  )

  if (!preferences) {
    return (
      <Card>
        <CardHeader title="Notifications" />
        <Alert tone="info">
          Notification preferences are not available yet. Apply the latest database migrations.
        </Alert>
      </Card>
    )
  }

  const set = (patch: PreferencesInput) => update.mutate(patch)

  async function enableBrowser(on: boolean) {
    if (on && browserNotificationsSupported() && Notification.permission === 'default') {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') return
    }
    set({ browser_enabled: on })
  }

  return (
    <Card>
      <CardHeader
        title="Notifications"
        description="Choose how Planora keeps you informed."
        action={<Bell className="size-5 text-navy-400" aria-hidden />}
      />
      {update.error && <Alert>{errorMessage(update.error)}</Alert>}
      <div className="divide-y divide-cream-200">
        <Toggle
          label="In-app notifications"
          description="Show reminders and alerts in the notification centre."
          checked={preferences.in_app_enabled}
          onChange={(v) => set({ in_app_enabled: v })}
        />
        <Toggle
          label="Email notifications"
          description="Email me reminders and overdue alerts."
          checked={preferences.email_enabled}
          onChange={(v) => set({ email_enabled: v })}
        />
        <div>
          <Toggle
            label="Browser notifications"
            description="Show a system notification when Planora is open in another tab."
            checked={preferences.browser_enabled && permission === 'granted'}
            disabled={permission === 'unsupported' || permission === 'denied'}
            onChange={(v) => void enableBrowser(v)}
          />
          {permission === 'denied' && (
            <p className="pb-3 text-xs text-amber-700">
              Notifications are blocked for this site. Allow them in your browser settings first.
            </p>
          )}
          {permission === 'unsupported' && (
            <p className="pb-3 text-xs text-navy-500">
              This browser does not support notifications.
            </p>
          )}
        </div>
        <Toggle
          label="Overdue task alerts"
          description="Notify me when a task passes its due date."
          checked={preferences.overdue_alerts}
          onChange={(v) => set({ overdue_alerts: v })}
        />
        <Toggle
          label="Due-soon alerts"
          description="Notify me about tasks due today or tomorrow."
          checked={preferences.due_soon_alerts}
          onChange={(v) => set({ due_soon_alerts: v })}
        />
        <div className="grid gap-4 py-4 sm:grid-cols-2">
          <Select
            label="Default reminder time"
            value={String(preferences.default_reminder_minutes)}
            onChange={(e) => set({ default_reminder_minutes: Number(e.target.value) })}
            options={REMINDER_LEAD_OPTIONS}
            hint="Relative to 09:00 on the due date."
          />
          <Select
            label="Week starts on"
            value={String(preferences.week_starts_on)}
            onChange={(e) => set({ week_starts_on: Number(e.target.value) as 0 | 1 })}
            options={[
              { value: '1', label: 'Monday' },
              { value: '0', label: 'Sunday' },
            ]}
          />
        </div>
      </div>
    </Card>
  )
}

function AccountSection() {
  const remove = useDeleteAccount()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  return (
    <Card>
      <CardHeader
        title="Account"
        action={<ShieldCheck className="size-5 text-navy-400" aria-hidden />}
      />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Password</p>
            <p className="text-sm text-navy-500">
              We’ll email you a secure link to choose a new password.
            </p>
          </div>
          <Link to="/forgot-password" className={buttonClasses('secondary', 'sm')}>
            <KeyRound className="size-4" aria-hidden /> Change password
          </Link>
        </div>
        <div className="flex flex-col gap-2 border-t border-cream-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-red-800">Delete account</p>
            <p className="text-sm text-navy-500">
              Permanently delete your account, workspace, tasks and documents.
            </p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
            Delete account
          </Button>
        </div>
        <p className="text-xs text-navy-500">
          Read how we handle your data in the{' '}
          <Link to="/privacy" className="font-semibold text-sage-700 hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete your account?"
        description="This cannot be undone. All your tasks, projects, documents and settings will be permanently deleted."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={remove.isPending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={confirmText !== 'DELETE'}
              loading={remove.isPending}
              onClick={() => remove.mutate()}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {remove.error && <Alert>{errorMessage(remove.error)}</Alert>}
          <p className="flex items-start gap-2 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> Type DELETE to confirm.
          </p>
          <Input
            label="Confirmation"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
        </div>
      </Modal>
    </Card>
  )
}
