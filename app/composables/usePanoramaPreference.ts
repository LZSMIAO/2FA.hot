/**
 * The backdrop's scene and playback live in cookies, so the header can offer
 * the same two controls the panorama does without either component knowing
 * about the other. On a phone the panorama's own controls sit off screen, and
 * the header menu is the only way to reach them.
 */
export const panoramaScenes = [
  '26.3',
  '26.2',
  '26.1',
  '1.21.11',
  '1.21.9',
  '1.21.6',
  '1.21.5',
  '1.21.4',
  '1.21',
  '1.20.1',
  '1.19.4',
  '1.18.2',
  '1.17.1',
  '1.16.5',
  '1.14.4'
] as const
export type PanoramaScene = (typeof panoramaScenes)[number]
/**
 * Scenes are offered by group, each folded behind one menu entry, so a long
 * run of versions never pushes the upload and custom entries off the bottom
 * of the menu. Another collection is another entry here.
 */
export const panoramaGroups = [
  { id: 'minecraft', label: 'Minecraft', scenes: panoramaScenes }
] as const
export const previewOf = (scene: string) => `/panorama/previews/${scene}.png`
// New visitors are set to 26.1 at a chosen angle before first paint; see public/panorama-preference.js.
export const defaultPanoramaScene: PanoramaScene = '1.20.1'
/** The visitor's own background, kept in IndexedDB; see ~/utils/custom-panorama. */
export const customPanoramaScene = 'custom'

export function usePanoramaPreference() {
  const selected = useCookie<string>('2fa-panorama', {
    default: () => defaultPanoramaScene,
    maxAge: 31536000,
    sameSite: 'lax'
  })
  const playbackPaused = useCookie<boolean>('2fa-panorama-paused', {
    default: () => true,
    maxAge: 31536000,
    sameSite: 'lax'
  })
  // Shared with the header menu: whether a custom background exists, and its shape.
  const custom = useState<{ layout: 'cube' | 'flat'; preview: string } | null>(
    'custom-panorama',
    () => null
  )
  return { scenes: panoramaScenes, selected, playbackPaused, custom }
}
