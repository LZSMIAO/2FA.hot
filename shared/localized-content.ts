import type { Guide } from './seo/guides'
import type { parseAboutReadme } from '../app/utils/about-readme'

export interface LocalizedContent {
  about: ReturnType<typeof parseAboutReadme>
  guides: Guide[]
}
