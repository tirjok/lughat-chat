<script setup lang="ts">
import { useHealthPoll } from '../composables/useHealthPoll'

const { status, modelLoaded } = useHealthPoll()
</script>

<template>
  <div class="flex items-center gap-2 text-sm">
    <!-- Loading state: spinning loader -->
    <span aria-hidden="true" v-if="status === 'loading'" class="i-lucide-loader animate-spin w-4 h-4" />

    <!-- Ready state: green check -->
    <span aria-hidden="true" v-else-if="modelLoaded" class="i-lucide-check-circle w-4 h-4 text-green-500" />

    <!-- Error state: red alert -->
    <span aria-hidden="true" v-else class="i-lucide-alert-circle w-4 h-4 text-red-500" />

    <span>
      {{ status === 'loading' ? 'جاري التحميل...' : modelLoaded ? 'النموذج جاهز' : 'خطأ في تحميل النموذج' }}
    </span>
  </div>
</template>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
