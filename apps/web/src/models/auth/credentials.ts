export type CredentialField = 'email' | 'password' | 'confirmPassword'
export type CredentialIssue = 'invalid' | 'required' | 'too_short' | 'too_long' | 'mismatch'
export type CredentialIssues = Partial<Record<CredentialField, CredentialIssue>>

export const minPasswordLength = 8
/** bcrypt, used by Auth, ignores bytes after the 72nd. */
export const maxPasswordBytes = 72

export const normalizeEmail = (email: string) => email.trim().toLocaleLowerCase('en')
export const isValidEmail = (email: string) =>
  email.length <= 254 && /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)

export function validateSignIn(input: { email: string; password: string }): CredentialIssues {
  const issues: CredentialIssues = {}
  if (!isValidEmail(normalizeEmail(input.email))) issues.email = 'invalid'
  if (!input.password) issues.password = 'required'
  return issues
}

/** Auth enforces the same minimum; the client checks it first to explain the problem. */
export function validateSignUp(input: {
  email: string
  password: string
  confirmPassword: string
}): CredentialIssues {
  const issues: CredentialIssues = {}
  if (!isValidEmail(normalizeEmail(input.email))) issues.email = 'invalid'
  if ([...input.password].length < minPasswordLength) issues.password = 'too_short'
  else if (new TextEncoder().encode(input.password).length > maxPasswordBytes)
    issues.password = 'too_long'
  if (input.confirmPassword !== input.password) issues.confirmPassword = 'mismatch'
  return issues
}
