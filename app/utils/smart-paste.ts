import {
  accessLinkEntries,
  parseOtp,
  toOtpUri,
  defaults,
  identity,
  type BatchEntry,
  type OtpConfig
} from './otp.ts'

export interface PasteCandidate {
  config: OtpConfig
  line: number
  source: string
  suggestedAccount?: string
}
export interface PasteAnalysis {
  kind: 'single' | 'multiple' | 'review' | 'none'
  candidates: PasteCandidate[]
  issue?: string
  accounts?: string[]
}
const tryParse = (value: string) => {
  try {
    return parseOtp(value)
  } catch {
    return null
  }
}
/** A link's keys: a /2fa# link, plain or safe, may hold several. */
const tryLink = (value: string): OtpConfig[] => {
  try {
    const configs = accessLinkEntries(value)
    if (configs.length > 1) return configs
  } catch {}
  const config = tryParse(value)
  return config ? [config] : []
}

function decodeAccountCell(cell: string): string {
  const decoded = cell.replace(/""/g, '"')
  return decoded
}

export function normalizeClipboardText(text: string): string {
  // Excel serializes multiline cells as quoted TSV. Separate whole cells before
  // removing quotes so passwords and recovery addresses cannot bleed into keys.
  let isolated = text
  if (text.includes('\t') && text.includes('"')) {
    const cells: string[] = []
    let cell = '',
      quoted = false
    for (let i = 0; i < text.length; i++) {
      const char = text[i]!
      if (char === '"') {
        if (quoted && text[i + 1] === '"') {
          cell += '"'
          i++
        } else if (quoted || !cell.trim()) quoted = !quoted
        else cell += char
      } else if (!quoted && (char === '\t' || char === '\n' || char === '\r')) {
        cells.push(cell)
        cell = ''
      } else cell += char
    }
    cells.push(cell)
    isolated = cells.join('\n')
  }
  const cleaned = isolated
    .replace(/^[ \t]*\|[ :|-]+\|[ \t]*$/gm, '')
    .replace(/^[ \t]*\|(.+)\|[ \t]*$/gm, (row, content: string) =>
      /<br\s*\/?\s*>/i.test(content)
        ? content
            .split('|')
            .map((cell) =>
              decodeAccountCell(cell.replace(/<br\s*\/?\s*>/gi, '\n').replace(/\\(?=@)/g, ''))
            )
            .join('\n')
        : row
    )
    .replace(/[\u200b\u200e\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/g, '')
    .replace(/\\(?=@)/g, '')
    .replace(
      /(^|[\t\n])"((?:[^"]|"")*)"(?=\t|\r?\n|$)/g,
      (_, separator: string, cell: string) => separator + decodeAccountCell(cell)
    )
  const lines = cleaned.split(/\r\n?|\n/).flatMap((line) => {
    const cells = line.replace(/\\\s*$/, '').split('\t')
    // Distinct spreadsheet cells containing complete keys are separate records.
    return cells.length > 1 &&
      (cells.length > 2 ||
        cells.some((cell) => cell.includes('@')) ||
        cells.every((cell) => tryParse(cell.trim())))
      ? cells
      : [line.replace(/\\\s*$/, '')]
  })
  return lines.join('\n')
}

/** Field labels and list markers describe formatting, not account ownership. */
function accountLabel(value: string): string {
  const label = value.trim()
  if (!/[\p{L}\p{N}]/u.test(label) || /^\d+[.)]$/.test(label)) return ''
  if (
    /^(?:secret|(?:setup[ -]?)?key|secret[ -]?key|code|totp|2fa|password|密钥|密鑰|金鑰|验证码|驗證碼|密码|密碼)$/i.test(
      label
    )
  )
    return ''
  return label
}

/** Only complete tokens are candidates. Never remove prose and concatenate fragments. */
export function analyzePaste(text: string): PasteAnalysis {
  const candidates: PasteCandidate[] = []
  if (new TextEncoder().encode(text).length > 100_000)
    return { kind: 'none', candidates, issue: '文本超过 100KB，请分批处理。' }
  // Excel uses TSV, wrapping cells in quotes and doubling embedded quotes.
  // Quoted cells may contain multiple secrets. Keep their row boundaries intact.
  const spreadsheetText = normalizeClipboardText(text)
  const lines = spreadsheetText
    .split(/\r\n?|\n/)
    .map((source, i) => ({ source: source.trim(), line: i + 1 }))
    .filter((x) => x.source)
  if (lines.length > 100)
    return { kind: 'none', candidates, issue: '每次最多 100 条，请分批处理。' }
  let allStructured = true
  for (const { source, line } of lines) {
    // Reject an invalid URI as a whole; its secret parameter is not a fallback key.
    if (/^[a-z][\w+.-]*:\/\//i.test(source) || source.startsWith('/2fa')) {
      const configs = tryLink(source)
      for (const config of configs) candidates.push({ config, line, source })
      if (!configs.length) allStructured = false
      continue
    }
    if (source.includes('://')) {
      allStructured = false
      const remainder = source.replace(/[a-z][\w+.-]*:\/\/[^\s<>"'，。；）]+/gi, (value) => {
        for (const config of tryLink(value)) candidates.push({ config, line, source: value })
        return ' '
      })
      for (const match of remainder.matchAll(
        /(?:(?<![\p{L}\p{N}_=])|(?<=\p{Script=Han}))[a-z2-7]{16,}={0,6}(?:(?![\p{L}\p{N}_=])|(?=\p{Script=Han}))/giu
      )) {
        const config = tryParse(match[0])
        if (config) candidates.push({ config, line, source: match[0] })
      }
      continue
    }
    // Legacy named rows may contain several complete keys; email ownership is reviewed below.
    const cells = source
      .split('\t')
      .map((cell) => cell.trim())
      .filter(Boolean)
    const accountCells = cells.filter((cell) => /^[^\s@]+@[^\s@]+\.[a-z]{2,63}$/i.test(cell))
    if (cells.length > 1 && accountCells.length === 1) {
      const keyCells = cells.filter((cell) => cell !== accountCells[0])
      const configs = keyCells.map(tryParse)
      if (configs.length && configs.every((config) => config && !config.label)) {
        for (const config of configs)
          candidates.push({
            config: { ...config!, label: accountCells[0]! },
            line,
            source
          })
        continue
      }
    }
    const pieces = source.split(/[ \t]+/)
    const complete = pieces
      .map((value, index) => ({ config: tryParse(value), index }))
      .filter((item) => item.config)
    if (complete.length && pieces.some((value) => /^[a-z2-7]{4}$/i.test(value))) {
      const mixed: OtpConfig[] = []
      let groups: string[] = []
      const flush = () => {
        const config = tryParse(groups.join(' '))
        if (config) mixed.push(config)
        groups = []
      }
      for (const piece of pieces) {
        const config = tryParse(piece)
        if (config) {
          flush()
          mixed.push(config)
        } else if (/^[a-z2-7]{4}$/i.test(piece)) groups.push(piece)
        else flush()
      }
      flush()
      if (mixed.length > 1) {
        allStructured = false
        for (const config of mixed) candidates.push({ config, line, source })
        continue
      }
    }
    // Read grouped keys from the right so an adjacent account/domain stays intact.
    const unquoted = source.replace(/^["“]|["”]$/g, '')
    const accountKey = unquoted.match(/^(.+?)((?:[a-z2-7]{4}[ \t]+){3,}[a-z2-7]{4}={0,6})$/i)
    if (accountKey && !tryParse(unquoted) && !tryParse(accountKey[1]!.trim())) {
      const account = accountKey[1]!.replace(/[ \t:：|,;]+$/, '').replace(/\\(?=@)/g, '')
      if (
        /^[^\s@]+@[^\s@]+\.[a-z]{2,63}$/i.test(account) ||
        (/^[^\s]+$/.test(account) && /[ \t:：|,;]$/.test(accountKey[1]!))
      ) {
        const accountConfig = tryParse(accountKey[2]!)
        if (accountConfig && account.length <= 120) {
          accountConfig.label = accountLabel(account)
          candidates.push({ config: accountConfig, line, source })
          continue
        }
      }
    }
    const tokens = [
      ...source.matchAll(
        /(?:(?<![\p{L}\p{N}_=])|(?<=\p{Script=Han}))[a-z2-7]{16,}={0,6}(?:(?![\p{L}\p{N}_=])|(?=\p{Script=Han}))/giu
      )
    ]
      .map((match) => ({ match, config: tryParse(match[0]) }))
      .filter((item) => item.config !== null)
    // Multiple complete keys on one line are ambiguous, even if whitespace is valid Base32.
    if (tokens.length > 1) {
      allStructured = false
      for (const { match, config } of tokens)
        candidates.push({ config: config!, line, source: match[0] })
      continue
    }
    const whole = !tokens.length || source === tokens[0]!.match[0] ? tryParse(source) : null
    if (whole) {
      candidates.push({ config: whole, line, source })
      continue
    }
    const named =
      source.match(/^(.{1,120}?)[\t:：=][ \t]*(.+)$/u) || source.match(/^(\S{1,120})[ ]+(\S+)$/u)
    if (
      named &&
      (!/\s/.test(named[1]!.trim()) || /[\t:：=]/.test(source)) &&
      (!/[.!?。！？/]/.test(named[1]!) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(named[1]!))
    ) {
      const pieces = named[2]!.trim().split(/\s+/)
      const config =
        pieces.length === 1 || pieces.every((piece) => /^[a-z2-7]{4}$/i.test(piece))
          ? tryParse(named[2]!)
          : null
      if (config) {
        config.label ||= accountLabel(named[1]!)
        candidates.push({ config, line, source })
        continue
      }
    }
    allStructured = false
    for (const { match, config } of tokens)
      candidates.push({ config: config!, line, source: match[0] })
  }
  // An email address is not proof of ownership: it may be a recovery address.
  // Only a parsed OTP URI provides authoritative account metadata.
  const unboundAccountText = lines
    .filter(({ source }) => !/^(?:[a-z][\w+.-]*:\/\/|\/2fa)/i.test(source))
    .map(({ source }) => source.replace(/[a-z][\w+.-]*:\/\/[^\s]+/gi, ''))
    .join('\n')
  const accounts = [
    ...new Set([
      ...Array.from(
        unboundAccountText.matchAll(/[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi),
        (match) => match[0]
      ),
      ...candidates.map((candidate) => candidate.config.label).filter(Boolean)
    ])
  ]
  for (const candidate of candidates) {
    if (
      candidate.config.label.includes('@') &&
      !/^(?:[a-z][\w+.-]*:\/\/|\/2fa)/i.test(candidate.source)
    ) {
      candidate.config.label = ''
      allStructured = false
    }
  }
  // Suggest only one-email/one-key blocks. This is a hint, never ownership metadata.
  let blockAccounts: string[] = []
  let blockCandidates: PasteCandidate[] = []
  const flushSuggestion = () => {
    if (blockAccounts.length === 1 && blockCandidates.length === 1) {
      const candidate = blockCandidates[0]!
      if (!candidate.config.label) candidate.suggestedAccount = blockAccounts[0]
    }
    blockAccounts = []
    blockCandidates = []
  }
  for (const row of lines) {
    const emails = accounts.filter((account) => row.source.includes(account))
    if (emails.length && blockCandidates.length) flushSuggestion()
    blockAccounts.push(...emails.filter((email) => !blockAccounts.includes(email)))
    blockCandidates.push(...candidates.filter((candidate) => candidate.line === row.line))
  }
  flushSuggestion()
  const needsAccountReview =
    unboundAccountText.includes('@') && candidates.some((candidate) => !candidate.config.label)
  if (candidates.length > 100)
    return { kind: 'none', candidates: [], issue: '每次最多 100 条，请分批处理。' }
  return {
    kind: !candidates.length
      ? 'none'
      : needsAccountReview
        ? 'review'
        : candidates.length === 1
          ? 'single'
          : allStructured
            ? 'multiple'
            : 'review',
    candidates,
    accounts
  }
}

/** Keep common batch input readable; use a URI when metadata/settings require it. */
export function pastedBatchText(configs: OtpConfig[]): string {
  return configs
    .map((config) => {
      if (
        config.algorithm === defaults.algorithm &&
        config.digits === defaults.digits &&
        config.period === defaults.period &&
        !config.issuer &&
        !config.label.includes('@') &&
        (!config.label || accountLabel(config.label) === config.label) &&
        !/[\r\n\t]/.test(config.label)
      )
        return config.label ? `${config.label}\t${config.secret}` : config.secret
      const uri = new URL(toOtpUri(config))
      if (!config.label)
        uri.pathname = config.issuer ? '/' + encodeURIComponent(config.issuer + ':') : '/'
      return uri.toString()
    })
    .join('\n')
}

export function pastedInputText(
  current: string,
  pasted: string,
  start: number,
  end: number
): string {
  // A complete clipboard entry replaces an existing key, even with a collapsed selection.
  if (analyzePaste(pasted).candidates.length || /[\r\n]/.test(pasted)) return pasted
  return current.slice(0, start) + pasted + current.slice(end)
}

/** Formatting a valid key/link is not the same as discarding surrounding prose. */
export function extractedSurroundingText(source: string): boolean {
  return !!source.trim() && !tryParse(source) && analyzePaste(source).candidates.length === 1
}

/** A paste that only needed reformatting: every line is already a key or an otpauth link. */
export function formattedBatchSource(source: string): boolean {
  const lines = source.split(/\r?\n/).filter((line) => line.trim())
  return !!lines.length && lines.every((line) => !!tryParse(line.trim()))
}

/**
 * Batch rows show an otpauth link the way single input does: as its bare key.
 * The link itself is kept aside so the row's account and settings survive.
 */
export function tidyBatchLinks(text: string) {
  const links = new Map<string, string>()
  const tidy = text
    .split('\n')
    .map((line) => {
      const value = line.trim()
      const config = /^otpauth:\/\//i.test(value) ? tryParse(value) : null
      if (!config) return line
      links.set(config.secret, value)
      return config.secret
    })
    .join('\n')
  return { text: tidy, links }
}

/** Put kept links back on rows that still hold exactly their bare key. */
export function restoreBatchLinks(text: string, links: ReadonlyMap<string, string>): string {
  if (!links.size) return text
  return text
    .split('\n')
    .map((line) => links.get(line.trim()) ?? line)
    .join('\n')
}

/** Batch uses the same recognition rules, but preserves rejected rows instead of dropping them. */
export function parseSmartBatch(text: string): BatchEntry[] {
  if (new TextEncoder().encode(text).length > 100_000)
    throw new Error('文本超过 100KB，请分批处理。')
  const lines = normalizeClipboardText(text)
    .split(/\r?\n/)
    .map((value, index) => ({ value, line: index + 1 }))
    .filter((row) => row.value.trim())
  if (lines.length > 100) throw new Error('每次最多 100 条，请分批处理。')
  const seen = new Set<string>()
  return lines.map(({ value, line }) => {
    const result = analyzePaste(value)
    if (result.candidates.length !== 1)
      return { line, error: result.issue || '密钥格式不正确，请检查是否包含多余字符。' }
    const config = result.candidates[0]!.config
    const key = identity(config),
      duplicate = seen.has(key)
    seen.add(key)
    return { line, config, duplicate }
  })
}

/** Remove current batch rows using the same normalized line numbers as parsing. */
export function removeBatchLines(text: string, lines: readonly number[]): string {
  const removed = new Set(lines)
  return normalizeClipboardText(text)
    .split(/\r?\n/)
    .filter((_, index) => !removed.has(index + 1))
    .join('\n')
}

/**
 * Batch rows use LF only, matching the offsets a textarea reports for its value.
 * A copied line often carries its line break; the row separator is added on insert.
 */
export function batchPasteText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/^\s*\n/, '')
    .replace(/\n\s*$/, '')
}

/** Non-empty rows in a batch fill; each one becomes a separate entry. */
export function batchFillRows(text: string): number {
  return text.split('\n').filter((line) => line.trim()).length
}

/** The part of a batch fill that keeps its first `rows` non-empty rows. */
export function keptBatchFill(text: string, rows: number): string {
  if (rows <= 0) return ''
  const lines = text.split('\n')
  let seen = 0
  for (let i = 0; i < lines.length; i++)
    if (lines[i]!.trim() && ++seen === rows) return lines.slice(0, i + 1).join('\n')
  return text
}

/** Keep pasted batch entries separate from the text on either side of the selection. */
export function insertBatchText(current: string, incoming: string, start: number, end: number) {
  // start/end come from the textarea, which counts a CRLF as one character.
  current = current.replace(/\r\n?/g, '\n')
  incoming = batchPasteText(incoming)
  const before = current.slice(0, start)
  const after = current.slice(end)
  const leading = before && !before.endsWith('\n') && !incoming.startsWith('\n') ? '\n' : ''
  const trailing = after && !after.startsWith('\n') && !incoming.endsWith('\n') ? '\n' : ''
  return {
    text: before + leading + incoming + trailing + after,
    cursor: before.length + leading.length + incoming.length + trailing.length
  }
}
