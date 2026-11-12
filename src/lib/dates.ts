/**
 * Date helpers. Calendar dates are ISO strings (YYYY-MM-DD) treated as
 * timezone-free; "today" is always computed in the user's profile timezone.
 */

export type IsoDate = string

const DAY_MS = 86_400_000

/** Today's date in the given IANA timezone, e.g. "2026-11-12". */
export function todayInTz(timeZone: string, now: Date = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now)
}

export function isoToUtcDate(iso: IsoDate): Date {
  return new Date(`${iso}T00:00:00Z`)
}

export function utcDateToIso(date: Date): IsoDate {
  return date.toISOString().slice(0, 10)
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  return utcDateToIso(new Date(isoToUtcDate(iso).getTime() + days * DAY_MS))
}

export function addMonths(iso: IsoDate, months: number): IsoDate {
  const d = isoToUtcDate(iso)
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1))
  return utcDateToIso(target)
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((isoToUtcDate(b).getTime() - isoToUtcDate(a).getTime()) / DAY_MS)
}

export function startOfMonth(iso: IsoDate): IsoDate {
  return `${iso.slice(0, 7)}-01`
}

export function endOfMonth(iso: IsoDate): IsoDate {
  return addDays(addMonths(startOfMonth(iso), 1), -1)
}

/** 0 = Sunday … 6 = Saturday */
export function dayOfWeek(iso: IsoDate): number {
  return isoToUtcDate(iso).getUTCDay()
}

export function startOfWeek(iso: IsoDate, weekStartsOn: 0 | 1 = 1): IsoDate {
  const diff = (dayOfWeek(iso) - weekStartsOn + 7) % 7
  return addDays(iso, -diff)
}

/** Weeks (rows of 7 ISO dates) covering the month containing `iso`. */
export function monthGrid(iso: IsoDate, weekStartsOn: 0 | 1 = 1): IsoDate[][] {
  const first = startOfWeek(startOfMonth(iso), weekStartsOn)
  const last = endOfMonth(iso)
  const weeks: IsoDate[][] = []
  let cursor = first
  while (cursor <= last || weeks.length === 0) {
    const week: IsoDate[] = []
    for (let i = 0; i < 7; i++) {
      week.push(cursor)
      cursor = addDays(cursor, 1)
    }
    weeks.push(week)
  }
  return weeks
}

export function weekdayLabels(weekStartsOn: 0 | 1 = 1, style: 'short' | 'narrow' = 'short') {
  const base = isoToUtcDate('2026-11-01') // a Sunday
  return Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat('en-ZA', { weekday: style, timeZone: 'UTC' }).format(
      new Date(base.getTime() + ((i + weekStartsOn) % 7) * DAY_MS),
    ),
  )
}

export function formatDate(
  iso: IsoDate | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-ZA', { ...options, timeZone: 'UTC' }).format(isoToUtcDate(iso))
}

export function formatMonth(iso: IsoDate): string {
  return formatDate(iso, { month: 'long', year: 'numeric' })
}

/** Human-friendly due label relative to today. */
export function relativeDue(due: IsoDate, today: IsoDate): string {
  const diff = daysBetween(today, due)
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  if (diff === -1) return '1 day overdue'
  if (diff < 0) return `${-diff} days overdue`
  if (diff < 7) return `Due in ${diff} days`
  return `Due ${formatDate(due, { day: 'numeric', month: 'short' })}`
}

// ---------------------------------------------------------------------------
// Timestamps <-> wall-clock time in a timezone (for reminders)
// ---------------------------------------------------------------------------

function tzOffsetMs(timestamp: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(timestamp))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  )
  return asUtc - Math.floor(timestamp / 1000) * 1000
}

/** Convert a wall-clock date + time ("HH:MM") in `timeZone` to a UTC ISO timestamp. */
export function zonedToUtc(date: IsoDate, time: string, timeZone: string): string {
  const [h, m] = time.split(':').map(Number)
  const [y, mo, d] = date.split('-').map(Number)
  const guess = Date.UTC(y, mo - 1, d, h, m)
  let ts = guess - tzOffsetMs(guess, timeZone)
  // Second pass handles DST transitions.
  ts = guess - tzOffsetMs(ts, timeZone)
  return new Date(ts).toISOString()
}

/** Split a UTC timestamp into wall-clock date + time in `timeZone`. */
export function utcToZoned(timestamp: string, timeZone: string): { date: IsoDate; time: string } {
  const d = new Date(timestamp)
  const date = new Intl.DateTimeFormat('en-CA', { timeZone }).format(d)
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(d)
  return { date, time }
}

export function formatDateTime(timestamp: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-ZA', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export function timeAgo(timestamp: string, now: Date = new Date()): string {
  const secs = Math.round((now.getTime() - new Date(timestamp).getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

export function listTimezones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  return intl.supportedValuesOf?.('timeZone') ?? ['Africa/Johannesburg', 'UTC']
}
