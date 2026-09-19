/** Clipboard code output must never fall back to a setup secret as its label. */
export function codeOutput(label: string, code: string) {
  return label ? `${label}\t${code}` : code
}
