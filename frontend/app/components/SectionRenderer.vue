<template>
  <div dir="rtl">
    <!-- Section Header: Calligraphic -->
    <div class="mb-4 pb-3 border-b border-white/[0.04]">
      <h3
        class="font-arabic text-xl font-bold text-gold mb-0.5"
        dir="rtl"
      >
        {{ section.title }}
      </h3>
      <p class="text-[10px] font-sans text-ink-dim tracking-[0.15em] uppercase">
        {{ section.type }}
      </p>
    </div>

    <!-- Dialogue Section -->
    <template v-if="dialogueContent">
      <div
        v-for="(scene, sceneIdx) in dialogueContent.scenes"
        :key="sceneIdx"
        class="mb-4"
      >
        <p class="text-xs font-sans text-gold/70 mb-2 font-medium">
          {{ scene.label }}
        </p>
        <div class="space-y-2">
          <div
            v-for="line in scene.lines"
            :key="line.speaker"
            class="p-3 rounded-lg bg-studio-800 border border-white/[0.04]"
          >
            <p class="text-sm">
              <span class="font-semibold text-ink">{{ line.speaker }}:</span>
              <span
                class="font-arabic text-ink"
                dir="rtl"
              > {{ line.arabic }}</span>
              <span class="text-ink-dim text-xs"> — {{ line.english }}</span>
            </p>
            <button
              class="mt-2 text-xs text-gold/70 hover:text-gold transition-colors flex items-center gap-1"
              @click="handleTTS(line.arabic)"
            >
              <span class="ph ph-speaker text-sm" />
              <span>Listen</span>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Vocabulary Section -->
    <template v-if="vocabularyContent">
      <div class="space-y-2">
        <div
          v-for="category in vocabularyContent.categories"
          :key="category.label"
        >
          <p class="text-xs font-semibold text-gold/70 mb-1">
            {{ category.label }}
          </p>
          <div class="space-y-1">
            <div
              v-for="word in category.words"
              :key="word.arabic"
              class="p-3 rounded-lg bg-studio-800 border border-white/[0.04] flex items-center justify-between"
            >
              <div>
                <span class="font-arabic text-ink">{{ word.arabic }}</span>
                <span class="text-ink-dim text-xs ml-3">{{ word.english }}</span>
              </div>
              <button
                class="text-gold/70 hover:text-gold transition-colors"
                @click="handleTTS(word.arabic)"
              >
                <span class="ph ph-speaker text-sm" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Pronouns Section -->
    <template v-if="pronounsContent">
      <div class="space-y-2">
        <div
          v-for="entry in pronounsContent.pronouns"
          :key="entry.arabic"
          class="p-3 rounded-lg bg-studio-800 border border-white/[0.04]"
        >
          <div class="flex items-center justify-between">
            <div>
              <span class="font-arabic text-ink">{{ entry.arabic }}</span>
              <span class="text-ink-dim text-xs ml-3">{{ entry.english }}</span>
            </div>
            <button
              class="text-gold/70 hover:text-gold transition-colors"
              @click="handleTTS(entry.arabic)"
            >
              <span class="ph ph-speaker text-sm" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Expressions Section -->
    <template v-if="expressionsContent">
      <div class="space-y-2">
        <div
          v-for="expr in expressionsContent.expressions"
          :key="expr.arabic"
          class="p-3 rounded-lg bg-studio-800 border border-white/[0.04] flex items-center justify-between"
        >
          <div>
            <span class="font-arabic text-ink">{{ expr.arabic }}</span>
            <span class="text-ink-dim text-xs ml-3">{{ expr.english }}</span>
          </div>
          <button
            class="text-gold/70 hover:text-gold transition-colors"
            @click="handleTTS(expr.arabic)"
          >
            <span class="ph ph-speaker text-sm" />
          </button>
        </div>
      </div>
    </template>

    <!-- Grammar Section -->
    <template v-if="grammarContent">
      <div class="space-y-4">
        <div
          v-for="topic in grammarContent.topics"
          :key="topic.name"
          class="p-4 rounded-lg bg-studio-800 border border-white/[0.04]"
        >
          <h4 class="text-sm font-semibold text-gold mb-2">
            {{ topic.name }}
          </h4>
          <p class="text-sm text-ink mb-2">
            {{ topic.description }}
          </p>
          <div class="space-y-1">
            <div
              v-for="ex in topic.examples"
              :key="ex.arabic"
              class="text-sm"
            >
              <span
                class="font-arabic text-ink"
                dir="rtl"
              >{{ ex.arabic }}</span>
              <span class="text-ink-dim text-xs"> — {{ ex.english }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Audio element (shared) -->
    <audio
      ref="audioRef"
      :src="audioUrl || undefined"
      class="hidden"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  DialogueSectionContent,
  ExpressionsSectionContent,
  GrammarSectionContent,
  LessonSection,
  PronounsSectionContent,
  VocabularySectionContent
} from '../composables/useLessons'

interface SectionRendererProps {
  section: LessonSection
  lessonId: number
}

const props = defineProps<SectionRendererProps>()

const { synthesize } = useTtsApi()
const audioModule = useAudioModule()
const { audioUrl, audioRef, load, play: audioPlay, dispose } = audioModule
let isDisposed = false

async function handleTTS(text: string) {
  if (isDisposed) return
  try {
    const blob = await synthesize({ text })
    load(blob)
    // Play after load() sets the src on the audio element
    await audioPlay()
  } catch {
    // Error already surfaced by synthesize via toast — nothing to do
  }
}

onBeforeUnmount(() => {
  isDisposed = true
  dispose()
})

// Type-safe narrowing: each computed returns the correctly-typed content for its section type.

const dialogueContent = computed<DialogueSectionContent | undefined>(() => {
  if (props.section.type === 'dialogue') return props.section.content as DialogueSectionContent
  return undefined
})

const vocabularyContent = computed<VocabularySectionContent | undefined>(() => {
  if (props.section.type === 'vocabulary') return props.section.content as VocabularySectionContent
  return undefined
})

const pronounsContent = computed<PronounsSectionContent | undefined>(() => {
  if (props.section.type === 'pronouns') return props.section.content as PronounsSectionContent
  return undefined
})

const expressionsContent = computed<ExpressionsSectionContent | undefined>(() => {
  if (props.section.type === 'expressions') return props.section.content as ExpressionsSectionContent
  return undefined
})

const grammarContent = computed<GrammarSectionContent | undefined>(() => {
  if (props.section.type === 'grammar') return props.section.content as GrammarSectionContent
  return undefined
})
</script>
