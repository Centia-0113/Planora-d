import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  daysBetween,
  endOfMonth,
  monthGrid,
  relativeDue,
  startOfWeek,
  todayInTz,
  utcToZoned,
  zonedToUtc,
} from './dates'

describe('calendar date helpers', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29')
  })

  it('adds months from the first of the month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-01')
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-01')
  })

  it('finds the end of the month', () => {
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28')
    expect(endOfMonth('2028-02-10')).toBe('2028-02-29')
  })

  it('counts days between dates', () => {
    expect(daysBetween('2026-11-12', '2026-11-20')).toBe(8)
    expect(daysBetween('2026-11-12', '2026-11-10')).toBe(-2)
  })

  it('finds the start of the week for Monday and Sunday starts', () => {
    expect(startOfWeek('2026-11-12', 1)).toBe('2026-11-09')
    expect(startOfWeek('2026-11-12', 0)).toBe('2026-11-08')
  })

  it('builds a month grid of full weeks', () => {
    const grid = monthGrid('2026-11-12', 1)
    expect(grid[0][0]).toBe('2026-10-26')
    expect(grid.at(-1)!.at(-1)! >= '2026-11-30').toBe(true)
    expect(grid.every((w) => w.length === 7)).toBe(true)
    expect(grid.flat()).toContain('2026-11-30')
  })
})

describe('relativeDue', () => {
  it('describes due dates relative to today', () => {
    expect(relativeDue('2026-11-12', '2026-11-12')).toBe('Due today')
    expect(relativeDue('2026-11-13', '2026-11-12')).toBe('Due tomorrow')
    expect(relativeDue('2026-11-11', '2026-11-12')).toBe('1 day overdue')
    expect(relativeDue('2026-11-09', '2026-11-12')).toBe('3 days overdue')
    expect(relativeDue('2026-11-15', '2026-11-12')).toBe('Due in 3 days')
  })
})

describe('timezones', () => {
  it('computes today in the given timezone', () => {
    const instant = new Date('2026-11-11T23:30:00Z')
    expect(todayInTz('Africa/Johannesburg', instant)).toBe('2026-11-12')
    expect(todayInTz('America/New_York', instant)).toBe('2026-11-11')
  })

  it('converts wall-clock time to UTC and back', () => {
    expect(zonedToUtc('2026-11-12', '09:00', 'Africa/Johannesburg')).toBe(
      '2026-11-12T07:00:00.000Z',
    )
    expect(utcToZoned('2026-11-12T07:00:00.000Z', 'Africa/Johannesburg')).toEqual({
      date: '2026-11-12',
      time: '09:00',
    })
  })

  it('handles daylight saving time', () => {
    // London is UTC+1 in July and UTC+0 in December.
    expect(zonedToUtc('2026-07-01', '09:00', 'Europe/London')).toBe('2026-07-01T08:00:00.000Z')
    expect(zonedToUtc('2026-12-01', '09:00', 'Europe/London')).toBe('2026-12-01T09:00:00.000Z')
  })
})
