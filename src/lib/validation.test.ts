import { describe, expect, it } from 'vitest'
import { validateEmail, validateFullName, validatePassword } from './validation'

describe('validateEmail', () => {
  it.each(['', '   '])('requires a value (%j)', (value) => {
    expect(validateEmail(value)).toBe('Email is required.')
  })
  it.each(['plainaddress', 'a@b', '@example.com', 'name@ example.com'])('rejects %s', (value) => {
    expect(validateEmail(value)).toBe('Enter a valid email address.')
  })
  it('accepts a normal address, ignoring surrounding spaces', () => {
    expect(validateEmail('  user@example.co.za ')).toBeUndefined()
  })
})

describe('validatePassword', () => {
  it('requires a value', () => {
    expect(validatePassword('')).toBe('Password is required.')
  })
  it('enforces the minimum length', () => {
    expect(validatePassword('abc123')).toMatch(/at least 8/)
  })
  it('requires both letters and numbers', () => {
    expect(validatePassword('abcdefgh')).toMatch(/letter and one number/)
    expect(validatePassword('12345678')).toMatch(/letter and one number/)
  })
  it('accepts a valid password', () => {
    expect(validatePassword('planora2026')).toBeUndefined()
  })
})

describe('validateFullName', () => {
  it('requires a name', () => {
    expect(validateFullName('  ')).toBe('Your name is required.')
  })
  it('limits length to 120 characters', () => {
    expect(validateFullName('a'.repeat(121))).toMatch(/120/)
    expect(validateFullName('a'.repeat(120))).toBeUndefined()
  })
})
