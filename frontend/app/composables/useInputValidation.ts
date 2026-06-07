// Validation composable for TTS input
// Pure function — accepts raw values, returns validation state

const EMPTY_TEXT_ERROR = 'Please enter text to convert to speech'
const MODEL_LOADING_ERROR = 'Model is loading, please wait...'

export type ModelStatus = 'loading' | 'ready' | 'error'

interface UseInputValidationResult {
  isValid: boolean
  error: string | null
  handleKeyDown: (event: KeyboardEvent, onValid?: () => void) => void
}

export function useInputValidation(
  textInput: string,
  modelStatus: ModelStatus
): UseInputValidationResult {
  const trimmed = textInput.trim()

  // Determine validation state
  let isValid = false
  let error: string | null = null

  if (trimmed.length === 0) {
    // Empty text error always takes priority
    isValid = false
    error = EMPTY_TEXT_ERROR
  } else if (modelStatus !== 'ready') {
    // Non-empty text but model not ready
    isValid = false
    error = MODEL_LOADING_ERROR
  } else {
    // Both conditions satisfied
    isValid = true
    error = null
  }

  return {
    isValid,
    error,
    handleKeyDown: (event: KeyboardEvent, onValid?: () => void) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && isValid && onValid) {
        onValid()
      }
    }
  }
}
