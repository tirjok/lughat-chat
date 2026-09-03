<script setup lang="ts">
import { getLessonById } from '~/data/curriculum'

const route = useRoute()


const lessonId = computed(() => {
  const level = (route.params?.level as string) || ''
  const lesson = (route.params?.lesson as string) || ''
  if (level && lesson) {
    return level.toLowerCase() + '-' + lesson.padStart(2, '0')
  }
  return ''
})

const levelCode = computed(() => (route.params?.level as string) || '')

const resolvedLesson = computed(() => {
  if (lessonId.value) return getLessonById(lessonId.value)
  return undefined
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 px-4">
    <div class="text-center max-w-md">
      <p
        class="text-6xl font-bold text-primary-600 dark:text-primary-400 mb-4"
      >
        404
      </p>
      <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2">
        Page not found
      </h1>
      <p
        v-if="resolvedLesson"
        class="text-stone-500 dark:text-stone-400 mb-6"
      >
        The lesson "{{ resolvedLesson.id }}" does not exist in Level {{ levelCode || 'unknown' }}.
      </p>
      <p
        v-else
        class="text-stone-500 dark:text-stone-400 mb-6"
      >
        The level or lesson you are looking for does not exist.
      </p>
      <NuxtLink
        to="/dashboard"
        class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
      >
        Back to Dashboard
      </NuxtLink>
    </div>
  </div>
</template>
