<script setup lang="ts">
interface Props {
  level: string
  lessonNumber: string | number
  arabicTitle?: string
  estimatedTime?: string
  scenes?: string
  audioType?: string
  isReady?: boolean
}

const _props = withDefaults(defineProps<Props>(), {
  arabicTitle: '',
  estimatedTime: '',
  scenes: '',
  audioType: '',
  isReady: true
})
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden dark:bg-stone-900 dark:border-stone-700">
    <div class="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 px-6 py-8 md:px-8 md:py-10 relative overflow-hidden">
      <!-- Decorative Arabic text overlay -->
      <div
        class="absolute inset-0 opacity-10"
        aria-hidden="true"
      >
        <div class="absolute top-4 right-8 font-arabic text-5xl md:text-7xl text-white">
          {{ arabicTitle || 'السَّلَامُ عَلَيْكُمْ' }}
        </div>
        <div class="absolute bottom-4 left-8 font-arabic text-4xl md:text-5xl text-white">
          مَرْحَبًا
        </div>
      </div>

      <!-- Content (relative z-10) -->
      <div class="relative z-10">
        <!-- Status pills row -->
        <div class="flex items-center gap-2 md:gap-3 mb-3">
          <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-semibold tracking-wide">
            LEVEL {{ level }}
          </span>
          <span class="px-3 py-1 bg-gold-400/90 rounded-full text-primary-900 text-xs font-semibold tracking-wide">
            LESSON {{ lessonNumber }}
          </span>
          <span
            v-if="isReady"
            class="px-3 py-1 bg-green-400/90 rounded-full text-green-900 text-xs font-semibold flex items-center gap-1.5"
          >
            <span class="w-1.5 h-1.5 bg-green-700 rounded-full" />
            Ready
          </span>
        </div>
        <!-- Metadata row -->
        <div
          v-if="estimatedTime || scenes || audioType"
          class="flex flex-wrap items-center gap-3 md:gap-4 text-primary-100 text-sm"
        >
          <span
            v-if="estimatedTime"
            class="flex items-center gap-1.5"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {{ estimatedTime }}
          </span>
          <span
            v-if="scenes"
            class="flex items-center gap-1.5"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            {{ scenes }}
          </span>
          <span
            v-if="audioType"
            class="flex items-center gap-1.5"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
            {{ audioType }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
