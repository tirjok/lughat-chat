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
  /** 0-based index of this section within the lesson's sections array. */
  sectionIndex?: number
  /** Total number of sections in this lesson. */
  sectionCount?: number
  /** Map of activity ID → progress for this lesson. */
  activityProgress?: Record<string, { score: number, status: string, attempts: number }>
  /** Array of activities for this lesson (used to determine section→activity mapping). */
  lessonActivities?: { id: number, type: string }[]
}

const props = withDefaults(defineProps<SectionRendererProps>(), {
  sectionIndex: () => 0,
  sectionCount: () => 5,
  activityProgress: () => ({}),
  lessonActivities: () => []
})

const emit = defineEmits<{ toggle: [sectionIndex: number] }>()

const { synthesize } = useTtsApi()
const audioModule = useAudioModule()
const { audioUrl, audioRef, load, play: audioPlay, dispose } = audioModule
let isDisposed = false

// ─── Smart Accordion Logic ──────────────────────────────────────────────

/** Determine if this section should be open by default. */
const isDefaultOpen = computed<boolean>(() => {
  const idx = props.sectionIndex
  // First section always opens
  if (idx === 0) return true

  // If this section's corresponding activity is in_progress, open it
  const activity = props.lessonActivities?.[idx]
  if (activity) {
    const progress = props.activityProgress?.[activity.id]
    if (progress && progress.status === 'in_progress') return true
  }
  return false
})

const isOpen = shallowRef(isDefaultOpen.value)

function toggleSection(): void {
  isOpen.value = !isOpen.value
  emit('toggle', props.sectionIndex)
}

// ─── Section Content Narrowing ──────────────────────────────────────────

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

// ─── Activity Progress for This Section ─────────────────────────────────

const sectionActivity = computed<{ id: number, type: string } | undefined>(() => {
  return props.lessonActivities?.[props.sectionIndex]
})

const sectionProgress = computed(() => {
  const activity = sectionActivity.value
  if (!activity) return null
  return props.activityProgress?.[activity.id] ?? null
})

const sectionHasActivity = computed(() => !!sectionActivity.value)

// ─── TTS Handler ────────────────────────────────────────────────────────

const isSynthesizing = shallowRef(false)

async function handleTTS(text: string) {
  if (isDisposed || isSynthesizing.value) return
  isSynthesizing.value = true
  try {
    const blob = await synthesize({ text })
    load(blob)
    await audioPlay()
  } catch {
    // Error already surfaced by synthesize via toast — nothing to do
  } finally {
    isSynthesizing.value = false
  }
}

onBeforeUnmount(() => {
  isDisposed = true
  dispose()
})

// Section type labels for UI (Issue 12: user-facing labels)
const sectionTypeLabel: Record<string, string> = {
  dialogue: 'Dialogue Practice',
  vocabulary: 'Vocabulary Builder',
  pronouns: 'Pronoun Guide',
  expressions: 'Key Expressions',
  grammar: 'Grammar Rules'
}

const sectionTypeIcon: Record<string, string> = {
  dialogue: 'ph-chat-circle-dots',
  vocabulary: 'ph-book-open-text',
  pronouns: 'ph-text-aa',
  expressions: 'ph-chats-circle',
  grammar: 'ph-code'
}

function getTypeLabel(type: string): string {
  return sectionTypeLabel[type] || type
}

function getTypeIcon(type: string): string {
  return sectionTypeIcon[type] || 'ph-file'
}

// Gold-spectrum section status (Issue 9: no emerald/amber)
function getSectionStatusIcon(status: string): string {
  switch (status) {
    case 'completed': return 'ph ph-check-circle text-gold-bright text-xs'
    case 'in_progress': return 'ph ph-spinner text-gold text-xs animate-spin'
    default: return ''
  }
}
</script>

<template>
  <div dir="rtl">
    <!-- Section Header: Double-Bezel accordion trigger -->
    <div class="mb-4">
      <button
        :id="`section-trigger-${sectionIndex}`"
        :aria-expanded="isOpen"
        :aria-controls="`section-content-${sectionIndex}`"
        class="section-card"
        @click="toggleSection()"
      >
        <!-- Outer bezel shell -->
        <div class="flex items-center gap-3 px-4 py-3.5">
          <!-- Section number badge -->
          <span class="section-number">
            {{ (sectionIndex ?? 0) + 1 }}
          </span>

          <!-- Chevron icon: rotates on expand -->
          <span
            class="ph ph-caret-down text-gold/60 text-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-gold"
            :class="{ 'rotate-180': isOpen }"
          />

          <!-- Section icon — visible, gold spectrum -->
          <span
            class="ph text-gold text-lg"
            :class="getTypeIcon(section.type)"
          />

          <!-- Section title — high contrast, always readable -->
          <div class="flex-1 text-right">
            <h3 class="font-arabic text-base font-bold text-ink">
              {{ section.title }}
            </h3>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="eyebrow-badge">
                {{ getTypeLabel(section.type) }}
              </span>
              <!-- Status indicator — gold-spectrum (Issue 9) -->
              <span
                v-if="sectionHasActivity"
                class="flex items-center gap-1"
              >
                <span
                  v-if="sectionProgress?.status === 'completed'"
                  :class="getSectionStatusIcon(sectionProgress.status)"
                  title="Completed"
                />
                <span
                  v-else-if="sectionProgress?.status === 'in_progress'"
                  :class="getSectionStatusIcon(sectionProgress.status)"
                  title="In Progress"
                />
              </span>
            </div>
          </div>
        </div>
      </button>

      <!-- Expanded section content — Double-Bezel inner core -->
      <Transition
        enter="transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
        enter-from="opacity-0 max-h-0"
        enter-to="opacity-100 max-h-[2000px]"
        leave="transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        leave-from="opacity-100 max-h-[2000px]"
        leave-to="opacity-0"
      >
        <div
          v-if="isOpen"
          :id="`section-content-${sectionIndex}`"
          class="section-expanded overflow-hidden"
          role="region"
          :aria-labelledby="`section-trigger-${sectionIndex}`"
        >
          <!-- Inner bezel -->
          <div class="lesson-card-inner rounded-[calc(1.5rem-0.375rem)] p-4">
            <!-- Dialogue Section -->
            <template v-if="dialogueContent">
              <div
                v-for="(scene, sceneIdx) in dialogueContent.scenes"
                :key="sceneIdx"
                class="mb-4"
              >
                <p class="text-xs font-sans text-gold/60 mb-2 font-medium">
                  {{ scene.label }}
                </p>
                <div class="space-y-2">
                  <div
                    v-for="line in scene.lines"
                    :key="line.speaker"
                    class="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-4"
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
                      class="mt-2 text-xs text-gold/60 hover:text-gold transition-colors flex items-center gap-1.5 cursor-pointer"
                      :class="{ 'opacity-50 cursor-wait': isSynthesizing }"
                      :disabled="isSynthesizing"
                      @click="handleTTS(line.arabic)"
                    >
                      <span
                        v-if="isSynthesizing"
                        class="ph ph-spinner animate-spin-slow text-sm"
                      />
                      <span
                        v-else
                        class="ph ph-speaker text-sm"
                      />
                      <span>{{ isSynthesizing ? 'Loading...' : 'Listen' }}</span>
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
                  <p class="text-xs font-semibold text-gold/60 mb-2">
                    {{ category.label }}
                  </p>
                  <div class="space-y-1.5">
                    <div
                      v-for="word in category.words"
                      :key="word.arabic"
                      class="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-4 flex items-center justify-between"
                    >
                      <div>
                        <span class="font-arabic text-ink">{{ word.arabic }}</span>
                        <span class="text-ink-dim text-xs ml-3">{{ word.english }}</span>
                      </div>
                      <button
                        class="text-gold/50 hover:text-gold transition-colors cursor-pointer"
                        @click="handleTTS(word.arabic)"
                      >
                        <span class="ph ph-speaker text-lg" />
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
                  class="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-4"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="font-arabic text-ink">{{ entry.arabic }}</span>
                      <span class="text-ink-dim text-xs ml-3">{{ entry.english }}</span>
                    </div>
                    <button
                      class="text-gold/50 hover:text-gold transition-colors cursor-pointer"
                      @click="handleTTS(entry.arabic)"
                    >
                      <span class="ph ph-speaker text-lg" />
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
                  class="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-4 flex items-center justify-between"
                >
                  <div>
                    <span class="font-arabic text-ink">{{ expr.arabic }}</span>
                    <span class="text-ink-dim text-xs ml-3">{{ expr.english }}</span>
                  </div>
                  <button
                    class="text-gold/50 hover:text-gold transition-colors cursor-pointer"
                    @click="handleTTS(expr.arabic)"
                  >
                    <span class="ph ph-speaker text-lg" />
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
                  class="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-5"
                >
                  <h4 class="text-sm font-semibold text-gold mb-2">
                    {{ topic.name }}
                  </h4>
                  <p class="text-sm text-ink mb-3">
                    {{ topic.description }}
                  </p>
                  <div class="space-y-2">
                    <div
                      v-for="ex in topic.examples"
                      :key="ex.arabic"
                      class="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3"
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
          </div>
        </div>
      </Transition>

      <!-- Audio element (shared) -->
      <audio
        ref="audioRef"
        :src="audioUrl || undefined"
        class="hidden"
      />
    </div>
  </div>
</template>
