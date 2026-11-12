export const PASSWORD_MIN_LENGTH = 8

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Email is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.'
  return undefined
}

export function validatePassword(password: string): string | undefined {
  if (!password) return 'Password is required.'
  if (password.length < PASSWORD_MIN_LENGTH)
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    return 'Password must include at least one letter and one number.'
  return undefined
}

export function validateFullName(name: string): string | undefined {
  if (!name.trim()) return 'Your name is required.'
  if (name.trim().length > 120) return 'Name must be 120 characters or fewer.'
  return undefined
}
