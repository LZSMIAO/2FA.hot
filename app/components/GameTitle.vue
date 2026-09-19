<script setup lang="ts">
defineProps<{ splash?: string }>()

const titleId = useId()
const faceId = `${titleId}-face`
const clipId = `${titleId}-clip`
const stoneId = `${titleId}-stone`
</script>

<template>
  <span class="game-title" aria-hidden="true">
    <svg class="game-title-letters" viewBox="-3 -3 86 39" focusable="false">
      <!-- Original block lettering; shared outlines keep the extrusion crisp. -->
      <defs>
        <path
          :id="faceId"
          fill-rule="evenodd"
          d="M0 0H20V4H24V12H20V16H8V20H24V28H0V16H4V12H16V8H0ZM32 0H52V8H40V12H50V20H40V28H32ZM64 0H76V4H80V28H72V20H68V28H60V4H64ZM68 8V12H72V8Z"
        />
        <linearGradient :id="stoneId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#d5d5d5" />
          <stop offset="0.46" stop-color="#bfbfbf" />
          <stop offset="1" stop-color="#999999" />
        </linearGradient>
        <clipPath :id="clipId"><use :href="`#${faceId}`" /></clipPath>
      </defs>
      <use :href="`#${faceId}`" class="game-title-depth" transform="translate(0 4)" />
      <use :href="`#${faceId}`" class="game-title-face" :fill="`url(#${stoneId})`" />
      <g :clip-path="`url(#${clipId})`" class="game-title-stone">
        <path
          class="game-title-bevel"
          d="M0 26h24v2H0ZM32 26h8v2h-8ZM40 18h10v2H40ZM40 6h12v2H40ZM60 26h8v2h-8ZM72 26h8v2h-8"
        />
        <g class="game-title-cuts">
          <path
            fill="#ededed"
            opacity=".65"
            transform="translate(.45 .65)"
            d="M13 0h1v4h-2v3h-1V3h2ZM34 20h3v1h-2v3h-1ZM76 13h4v1h-3v3h-1Z"
          />
          <path fill="#686868" d="M13 0h1v4h-2v3h-1V3h2ZM34 20h3v1h-2v3h-1ZM76 13h4v1h-3v3h-1Z" />
        </g>
      </g>
      <path class="game-title-shine" d="M1 1H19M33 1H51M65 1H75" />
    </svg>
    <svg
      v-if="!splash"
      class="game-title-splash hot-splash"
      viewBox="-1 -1 22 10"
      focusable="false"
    >
      <!-- One-pixel stems and open counters keep the splash lighter than the title. -->
      <path
        fill-rule="evenodd"
        d="M0 6h1v1H0ZM3 0h1v3h1V2h2v1h1v4H7V3H5v1H4v3H3ZM11 2h3v1h1v3h-1v1h-3V6h-1V3h1Zm0 1v3h3V3ZM18 0h1v2h2v1h-2v3h2v1h-2V6h-1V3h-1V2h1Z"
      />
    </svg>
    <span v-if="splash" class="game-title-splash message-splash fixed-splash">{{ splash }}</span>
    <span v-else class="game-title-splash message-splash" />
  </span>
</template>

<style scoped>
.game-title {
  position: relative;
  display: block;
  width: 18rem;
  height: 7.25rem;
  max-width: 100%;
  direction: ltr;
  isolation: isolate;
}
.game-title-letters {
  display: block;
  width: 13.5rem;
  height: auto;
  overflow: visible;
}
.game-title-depth {
  fill: oklch(0.34 0 0);
  stroke: oklch(0.13 0 0);
  stroke-width: 1.5;
  stroke-linejoin: miter;
}
.game-title-face {
  stroke: oklch(0.17 0 0);
  stroke-width: 1.5;
  stroke-linejoin: miter;
  paint-order: stroke fill;
}
.game-title-shine {
  fill: none;
  stroke: oklch(0.95 0 0);
  stroke-width: 1;
}
.game-title-bevel {
  fill: oklch(0.39 0 0);
  opacity: 0.6;
}
.game-title-splash {
  position: absolute;
  left: 11rem;
  top: 3.25rem;
  width: 5.75rem;
  height: auto;
  overflow: visible;
  fill: oklch(0.968 0.211 109.77);
  stroke: #292a15;
  stroke-width: 0.22;
  stroke-linejoin: miter;
  paint-order: stroke fill;
  filter: drop-shadow(2px 2px 0 #3f3f00);
  transform: rotate(-20deg);
  transform-origin: center;
  animation: title-splash 500ms linear infinite;
}
:global(html[data-brand-splash='message'] .hot-splash) {
  display: none;
}
.message-splash {
  display: none;
  left: 8.75rem;
  top: 3.35rem;
  width: 10.5rem;
  color: oklch(0.968 0.211 109.77);
  font-family: 'VT323', monospace;
  font-size: 2.25rem;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
}
:global(html[data-brand-splash='message'] .message-splash) {
  display: block;
}
.fixed-splash {
  display: block;
}
.message-splash:not(.fixed-splash)::after {
  content: var(--brand-splash-message, '');
}
@keyframes title-splash {
  0%,
  100% {
    transform: rotate(-20deg) scale(1);
  }
  12.5%,
  87.5% {
    transform: rotate(-20deg) scale(0.979);
  }
  25%,
  75% {
    transform: rotate(-20deg) scale(0.961);
  }
  37.5%,
  62.5% {
    transform: rotate(-20deg) scale(0.949);
  }
  50% {
    transform: rotate(-20deg) scale(0.944);
  }
}
@media (max-width: 600px), (max-height: 500px) and (pointer: coarse) {
  .game-title {
    width: 17rem;
    height: 6rem;
  }
  .game-title-letters {
    width: 11rem;
  }
  .game-title-splash {
    left: 8.75rem;
    top: 2.65rem;
    width: 4.75rem;
  }
}
@media (max-width: 600px), (max-height: 500px) and (pointer: coarse) {
  .message-splash {
    left: 6.25rem;
    top: 2.8rem;
    font-size: 1.875rem;
    width: 9.5rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .game-title-splash {
    animation: none;
  }
}
</style>
