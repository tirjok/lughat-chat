// Validation composable for TTS input
// Pure function — accepts raw values, returns validation state

const EMPTY_TEXT_ERROR = 'Please enter text to convert to speech'
const MODEL_LOADING_ERROR = 'Model is loading, please wait...'

export type ModelStatus = 'loading' | 'ready' | 'error'

interface UseInputValidationResult {
  isValid: boolean
  error: string | null
}

export function useInputValidation(
  textInput: string,
  modelStatus: ModelStatus
): UseInputValidationResult {
  const trimmed = textInput.trim()
  const hasText = trimmed.length > 0
  const isReady = modelStatus === 'ready'

  return {
    isValid: hasText && isReady,
    error: hasText
      ? isReady
        ? null
        : MODEL_LOADING_ERROR
      : EMPTY_TEXT_ERROR
  }
}
