/**
 * The backdrop's scene and playback live in cookies, so the header can offer
 * the same two controls the panorama does without either component knowing
 * about the other. On a phone the panorama's own controls sit off screen, and
 * the header menu is the only way to reach them.
 */
export const panoramaScenes = [
  '1.21',
  '1.20.1',
  '1.19.4',
  '1.18.2',
  '1.17.1',
  '1.16.5',
  '1.14.4'
] as const
export type PanoramaScene = (typeof panoramaScenes)[number]
export const defaultPanoramaScene: PanoramaScene = '1.20.1'

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
  return { scenes: panoramaScenes, selected, playbackPaused }
}
