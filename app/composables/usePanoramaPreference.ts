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
 * A still image drawn over the whole backdrop in place of the cube, served
 * from /panorama/<id>.webp. The screen crops it to fill, so position is a
 * focal point on the subject's face that keeps them in frame at any shape of
 * window - a centred crop took the head off the portrait one.
 */
export interface FlatPanorama {
  id: string
  label: string
  position: string
}
// Keep in sync with the flat map in public/panorama-preference.js.
export const senrenScenes: readonly FlatPanorama[] = [
  { id: 'senren/rena-stars', label: '蕾娜', position: '32% 30%' },
  { id: 'senren/koharu-haori', label: '小春', position: '21% 18%' },
  { id: 'senren/mako-ninja', label: '茉子', position: '30% 30%' },
  { id: 'senren/yoshino-ears', label: '芳乃', position: '43% 50%' },
  { id: 'senren/roka-teahouse', label: '芦花', position: '62% 24%' },
  { id: 'senren/yoshino-kagura', label: '芳乃', position: '52% 15%' },
  { id: 'senren/mako-feeding', label: '茉子', position: '50% 40%' },
  { id: 'senren/murasame-sword', label: '丛雨', position: '68% 30%' },
  { id: 'senren/roka-parfait', label: '芦花', position: '62% 24%' },
  { id: 'senren/rena-yukata', label: '蕾娜', position: '33% 24%' },
  { id: 'senren/koharu-lean', label: '小春', position: '55% 30%' },
  { id: 'senren/murasame-kiss', label: '丛雨', position: '47% 45%' }
]
export const flatPanoramaOf = (scene: string) => senrenScenes.find((flat) => flat.id === scene)
export const flatPanoramaUrl = (id: string) => `/panorama/${id}.webp`
/**
 * Scenes are offered by group, each folded behind one menu entry, so a long
 * run of versions never pushes the upload and custom entries off the bottom
 * of the menu. Another collection is another entry here.
 */
export const panoramaGroups = [
  {
    id: 'minecraft',
    label: 'Minecraft',
    scenes: panoramaScenes.map((version) => ({
      id: version as string,
      label: version as string,
      preview: `/panorama/previews/${version}.png`
    }))
  },
  {
    id: 'senren',
    label: '千恋＊万花',
    scenes: senrenScenes.map((flat) => ({
      id: flat.id,
      label: flat.label,
      preview: `/panorama/previews/${flat.id}.webp`
    }))
  }
]
/** Every built-in scene a saved choice may name, cube or still. */
export const isBuiltInScene = (scene: string) =>
  (panoramaScenes as readonly string[]).includes(scene) || !!flatPanoramaOf(scene)
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
