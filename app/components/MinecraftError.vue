<script setup lang="ts">
import GameTitle from '~/components/GameTitle.vue'

defineProps<{
  statusCode: number
  title: string
  description: string
  homePath: string
  homeLabel: string
}>()

const emit = defineEmits<{ returnHome: [] }>()
</script>

<template>
  <main class="minecraft-error ore-theme" aria-labelledby="error-title">
    <div class="error-menu">
      <div class="error-brand" role="img" aria-label="2FA.HOT">
        <GameTitle :splash="statusCode === 404 ? 'Creeper?!' : undefined" />
      </div>

      <section class="error-window ore-window" aria-labelledby="error-title">
        <div class="error-titlebar ore-window-title" aria-hidden="true">
          <svg
            class="error-creeper"
            viewBox="0 0 8 8"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
            shape-rendering="crispEdges"
          >
            <path fill="#71b844" d="M0 0h8v8H0z" />
            <path fill="#8bce5b" d="M0 0h3v1H0zM4 1h2v1H4zM0 4h1v2H0zM7 5h1v2H7z" />
            <path fill="#569332" d="M6 0h2v1H6zM3 1h1v1H3zM0 7h2v1H0zM6 7h2v1H6z" />
            <path fill="#172413" d="M1 2h2v2H1zM5 2h2v2H5zM3 4h2v1h1v3H5V7H3v1H2V5h1z" />
          </svg>
          <span>2FA.HOT</span>
          <span class="error-titlebar-code">{{ statusCode }}</span>
        </div>

        <div class="error-content">
          <div class="error-code" aria-hidden="true">{{ statusCode }}</div>
          <h1 id="error-title" class="error-heading">
            <span class="sr-only">{{ statusCode }} · </span>{{ title }}
          </h1>
          <p class="error-description">{{ description }}</p>
          <a :href="homePath" class="error-home primary-button" @click.prevent="emit('returnHome')">
            {{ homeLabel }}
          </a>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.minecraft-error {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  min-height: 100vh;
  min-height: 100svh;
  padding: 3rem 1rem 5rem;
}

.error-menu {
  width: min(100%, 32rem);
}

.error-brand {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.error-window {
  overflow: hidden;
}

.error-titlebar {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-height: 2.75rem;
  padding: 0.625rem 1rem;
  border-bottom: 2px solid var(--ore-outline);
  color: var(--ui-text-highlighted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  font-weight: 600;
}

.error-creeper {
  display: block;
  flex: none;
  width: 1rem;
  height: 1rem;
}

.error-titlebar-code {
  margin-inline-start: auto;
}

.error-content {
  padding: 1.5rem 2rem 2rem;
  text-align: center;
}

.error-code {
  direction: ltr;
  color: #d0d1d4;
  font-family: 'VT323', monospace;
  font-size: 9rem;
  line-height: 1;
  letter-spacing: 0.04em;
  padding-bottom: 1rem;
  -webkit-text-stroke: 2px #242425;
  paint-order: stroke fill;
  text-shadow:
    0 2px 0 #58585a,
    0 4px 0 #58585a,
    0 6px 0 #242425,
    0 8px 0 #242425;
}

.error-heading {
  margin: 0;
  color: var(--ui-text-highlighted);
  font-size: 1.5rem;
  line-height: 1.5;
  font-weight: 700;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.error-description {
  margin: 0.75rem 0 2rem;
  color: var(--ui-text-muted);
  font-size: 1rem;
  line-height: 1.75;
  overflow-wrap: anywhere;
  text-wrap: pretty;
}

.error-home {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 3.25rem;
  padding: 0.75rem 1rem;
  border: 2px solid var(--ore-outline);
  box-shadow: var(--ore-button-shadow);
  text-decoration: none;
  text-shadow: 0 2px 0 rgb(0 0 0 / 30%);
  overflow-wrap: anywhere;
}

.error-home:focus-visible {
  outline: 3px solid var(--ui-text-highlighted);
  outline-offset: 4px;
}

@media (max-width: 480px) {
  .minecraft-error {
    padding-top: 2rem;
  }

  .error-content {
    padding: 1.25rem 1.25rem 1.5rem;
  }

  .error-code {
    font-size: 7rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .error-home {
    transition: none;
  }
}
</style>
