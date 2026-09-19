import { parseOtp, toOtpUri } from './otp.ts'
import { isMigrationUri } from './ga-migration.ts'

/** Normalize equivalent account codes before showing the import checklist. */
export function collectQrChoices(values: string[]) {
  const choices: string[] = []
  const seen = new Set<string>()
  let duplicates = 0
  let unsupported = 0
  for (const raw of values) {
    const value = raw.trim()
    try {
      let canonical = value
      let key = value
      if (!isMigrationUri(value)) {
        if (!value.startsWith('otpauth://')) throw new Error('unsupported')
        const config = parseOtp(value)
        canonical = toOtpUri(config)
        key = JSON.stringify([
          config.kind || 'totp',
          config.secret,
          config.algorithm,
          config.digits,
          config.period
        ])
      }
      if (seen.has(key)) duplicates++
      else {
        seen.add(key)
        choices.push(canonical)
      }
    } catch {
      unsupported++
    }
  }
  return { choices, duplicates, unsupported }
}
