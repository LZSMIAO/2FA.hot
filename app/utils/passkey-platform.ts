/**
 * The passkey extension exists only for desktop Chrome and Edge. Phones and
 * tablets cannot install it, so the site should not offer it there.
 */
export function passkeyBrowser(
  agent: string,
  platform: string,
  touchPoints: number
): 'chrome' | 'edge' | 'other' {
  // iPadOS reports a desktop agent, so it is identified by its touch points.
  if (/Android|iPhone|iPad|Mobile/i.test(agent)) return 'other'
  if (platform === 'MacIntel' && touchPoints > 1) return 'other'
  if (/Edg\//.test(agent)) return 'edge'
  return /Chrome\//.test(agent) ? 'chrome' : 'other'
}
