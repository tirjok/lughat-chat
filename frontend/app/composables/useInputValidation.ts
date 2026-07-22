// Validation composable for TTS input
// Pure function — accepts raw values, returns validation state

const EMPTY_TEXT_ERROR = 'Please enter text to convert to speech'
const MODEL_LOADING_ERROR = 'Model is loading, please wait...'

export type ModelStatus = 'loading' | 'ready' | 'error' | 'retrying'

interface UseInputValidationResult {
  isValid: boolean
  error: string | null
}

export function useInputValidation(
  textInput: string,
  modelStatus: ModelStatus
): UseInputValidationResult {
  const trimmed = textInput.trim()

  // Determine validation state
  let isValid: boolean
  let error: string | null

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
    error
  }
}
