<script setup lang="ts">
/*
 * A page's name in the home page's block lettering (GameTitle.vue): the same
 * 28-unit letters with 8-unit strokes and stepped corners, the same stone,
 * outline, extrusion, bevel and cracks, drawn at the same scale, so the name
 * stands where the home page's 2FA does. English on every language's page,
 * as 2FA is; the page's own heading carries the translated name.
 */
type Word = 'HISTORY' | 'HELP' | 'ABOUT' | 'PRIVACY' | 'GUIDES'
const props = defineProps<{ word: Word }>()

type Glyph = { width: number; face: string; bevel: string; shine: string }
const glyphs: Record<string, Glyph> = {
  // GameTitle.vue's own A.
  A: {
    width: 20,
    face: 'M4 0H16V4H20V28H12V20H8V28H0V4H4ZM8 8V12H12V8Z',
    bevel: 'M0 26h8v2H0ZM12 26h8v2h-8Z',
    shine: 'M5 1H15'
  },
  B: {
    width: 24,
    face: 'M0 0H20V4H24V12H20V16H24V24H20V28H0ZM8 8V12H16V8ZM8 16V20H16V16Z',
    bevel: 'M0 26h20v2H0ZM8 6h8v2H8ZM8 14h8v2H8ZM20 10h4v2h-4Z',
    shine: 'M1 1H19'
  },
  C: {
    width: 22,
    face: 'M4 0H22V8H8V20H22V28H4V24H0V4H4Z',
    bevel: 'M4 26h18v2H4ZM8 6h14v2H8ZM0 22h4v2H0Z',
    shine: 'M5 1H21M9 21H21'
  },
  D: {
    width: 24,
    face: 'M0 0H20V4H24V24H20V28H0ZM8 8V20H16V8Z',
    bevel: 'M0 26h20v2H0ZM8 6h8v2H8Z',
    shine: 'M1 1H19'
  },
  G: {
    width: 24,
    face: 'M4 0H24V8H8V20H16V16H12V12H24V28H4V24H0V4H4Z',
    bevel: 'M4 26h20v2H4ZM8 6h16v2H8ZM12 14h4v2h-4ZM0 22h4v2H0Z',
    shine: 'M5 1H23M13 13H23M9 21H15'
  },
  U: {
    width: 24,
    face: 'M0 0H8V20H16V0H24V24H20V28H4V24H0Z',
    bevel: 'M4 26h16v2H4ZM0 22h4v2H0ZM20 22h4v2h-4Z',
    shine: 'M1 1H7M17 1H23M9 21H15'
  },
  V: {
    width: 24,
    face: 'M0 0H8V16H16V0H24V20H20V24H16V28H8V24H4V20H0Z',
    bevel: 'M8 26h8v2H8ZM4 22h4v2H4ZM16 22h4v2h-4ZM0 18h4v2H0ZM20 18h4v2h-4Z',
    shine: 'M1 1H7M17 1H23M9 17H15'
  },
  H: {
    width: 24,
    face: 'M0 0H8V10H16V0H24V28H16V18H8V28H0Z',
    bevel: 'M0 26h8v2H0ZM16 26h8v2h-8ZM8 16h8v2H8Z',
    shine: 'M1 1H7M17 1H23'
  },
  I: { width: 8, face: 'M0 0H8V28H0Z', bevel: 'M0 26h8v2H0Z', shine: 'M1 1H7' },
  S: {
    width: 24,
    face: 'M4 0H24V8H8V10H20V14H24V24H20V28H0V20H16V18H4V14H0V4H4Z',
    bevel: 'M8 6h16v2H8ZM4 16h12v2H4ZM0 26h20v2H0Z',
    shine: 'M5 1H23'
  },
  T: {
    width: 24,
    face: 'M0 0H24V8H16V28H8V8H0Z',
    bevel: 'M0 6h8v2H0ZM16 6h8v2h-8ZM8 26h8v2H8Z',
    shine: 'M1 1H23'
  },
  O: {
    width: 24,
    face: 'M4 0H20V4H24V24H20V28H4V24H0V4H4ZM8 8V20H16V8Z',
    bevel: 'M4 26h16v2H4ZM8 6h8v2H8Z',
    shine: 'M5 1H19'
  },
  R: {
    width: 24,
    face: 'M0 0H20V4H24V16H20V18H24V28H16V20H8V28H0ZM8 8V12H16V8Z',
    bevel: 'M0 26h8v2H0ZM16 26h8v2h-8ZM8 18h8v2H8ZM8 6h8v2H8Z',
    shine: 'M1 1H19'
  },
  Y: {
    width: 24,
    face: 'M0 0H8V8H16V0H24V12H20V16H16V28H8V16H4V12H0Z',
    bevel: 'M8 26h8v2H8ZM0 10h4v2H0ZM20 10h4v2h-4ZM4 14h4v2H4ZM16 14h4v2h-4Z',
    shine: 'M1 1H7M17 1H23'
  },
  E: {
    width: 22,
    face: 'M0 0H22V8H8V10H18V18H8V20H22V28H0Z',
    bevel: 'M8 6h14v2H8ZM8 16h10v2H8ZM0 26h22v2H0Z',
    shine: 'M1 1H21'
  },
  L: {
    width: 22,
    face: 'M0 0H8V20H22V28H0Z',
    bevel: 'M0 26h22v2H0Z',
    shine: 'M1 1H7M9 21H21'
  },
  P: {
    width: 24,
    face: 'M0 0H20V4H24V16H20V20H8V28H0ZM8 8V12H16V8Z',
    bevel: 'M0 26h8v2H0ZM8 18h12v2H8ZM8 6h8v2H8Z',
    shine: 'M1 1H19'
  }
}
// Hairline cracks, the two shapes of GameTitle.vue's, on the broad faces.
const cracks: Record<Word, [x: number, y: number, long: boolean][]> = {
  HISTORY: [
    [53, 0, true],
    [113, 14, false],
    [189, 16, true]
  ],
  HELP: [
    [5, 2, true],
    [37, 20, false],
    [105, 13, false]
  ],
  ABOUT: [
    [5, 6, true],
    [33, 21, false],
    [137, 12, true]
  ],
  PRIVACY: [
    [5, 14, true],
    [33, 22, false],
    [152, 0, true]
  ],
  GUIDES: [
    [5, 8, true],
    [97, 12, false],
    [150, 20, true]
  ]
}
const gap = 8
const letters = computed(() => {
  let x = 0
  return [...props.word].map((char) => {
    const glyph = glyphs[char]!
    const placed = { ...glyph, x }
    x += glyph.width + gap
    return placed
  })
})
const width = computed(
  () =>
    letters.value.reduce((sum, glyph) => sum + glyph.width, 0) + gap * (letters.value.length - 1)
)
const crackPath = computed(() =>
  cracks[props.word]
    .map(([x, y, long]) => (long ? `M${x} ${y}h1v4h-2v3h-1v-4h2Z` : `M${x} ${y}h3v1h-2v3h-1Z`))
    .join('')
)

const id = useId()
const faceId = `${id}-face`
const clipId = `${id}-clip`
const stoneId = `${id}-stone`
</script>

<template>
  <span class="page-wordmark" aria-hidden="true">
    <svg
      class="page-wordmark-letters"
      :viewBox="`-3 -3 ${width + 6} 39`"
      :style="{ '--units': width + 6 }"
      focusable="false"
    >
      <defs>
        <g :id="faceId">
          <path
            v-for="glyph in letters"
            :key="glyph.x"
            fill-rule="evenodd"
            :transform="`translate(${glyph.x} 0)`"
            :d="glyph.face"
          />
        </g>
        <linearGradient :id="stoneId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#d5d5d5" />
          <stop offset="0.46" stop-color="#bfbfbf" />
          <stop offset="1" stop-color="#999999" />
        </linearGradient>
        <clipPath :id="clipId">
          <path
            v-for="glyph in letters"
            :key="glyph.x"
            clip-rule="evenodd"
            :transform="`translate(${glyph.x} 0)`"
            :d="glyph.face"
          />
        </clipPath>
      </defs>
      <use :href="`#${faceId}`" class="page-wordmark-depth" transform="translate(0 4)" />
      <use :href="`#${faceId}`" class="page-wordmark-face" :fill="`url(#${stoneId})`" />
      <g :clip-path="`url(#${clipId})`">
        <path
          v-for="glyph in letters"
          :key="glyph.x"
          class="page-wordmark-bevel"
          :transform="`translate(${glyph.x} 0)`"
          :d="glyph.bevel"
        />
        <path fill="#ededed" opacity=".65" transform="translate(.45 .65)" :d="crackPath" />
        <path fill="#686868" :d="crackPath" />
      </g>
      <path
        v-for="glyph in letters"
        :key="glyph.x"
        class="page-wordmark-shine"
        :transform="`translate(${glyph.x} 0)`"
        :d="glyph.shine"
      />
    </svg>
  </span>
</template>

<style scoped>
/*
 * At GameTitle.vue's scale: 13.5rem for its 86 units. The box keeps 0.35rem
 * of air above the letters and 0.51rem below them, taken back by whoever
 * places it so the gaps are measured to the letters.
 */
.page-wordmark {
  display: block;
  direction: ltr;
  isolation: isolate;
}
.page-wordmark-letters {
  display: block;
  width: calc(var(--units) * 13.5rem / 86);
  max-width: 100%;
  height: auto;
  overflow: visible;
}
.page-wordmark-depth {
  fill: oklch(0.34 0 0);
  stroke: oklch(0.13 0 0);
  stroke-width: 1.5;
  stroke-linejoin: miter;
}
.page-wordmark-face {
  stroke: oklch(0.17 0 0);
  stroke-width: 1.5;
  stroke-linejoin: miter;
  paint-order: stroke fill;
}
.page-wordmark-bevel {
  fill: oklch(0.39 0 0);
  opacity: 0.6;
}
.page-wordmark-shine {
  fill: none;
  stroke: oklch(0.95 0 0);
  stroke-width: 1;
}
</style>
