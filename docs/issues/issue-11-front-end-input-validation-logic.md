# Issue 11: Frontend Input Validation Logic

## What to build

Input validation logic that prevents empty submissions, shows Arabic error messages, and enables Ctrl+Enter keyboard shortcut for quick generation.

## Acceptance criteria

- [ ] Validation function checks if text input is non-empty (trimmed)
- [ ] Empty submission shows Arabic error: "الرجاء إدخال نص للتحويل إلى كلام"
- [ ] Model not ready shows Arabic error: "جاري تحميل النموذج، يرجى الانتظار..."
- [ ] Ctrl+Enter keyboard shortcut triggers generation when text is valid
- [ ] Generate button is disabled when input is empty or model is loading
- [ ] Validation runs before API call, preventing unnecessary requests
- [ ] Error messages are reactive and clear when user starts typing

## Blocked by

- Issue 9: Frontend RTL Textarea Component (provides the input to validate)
- Issue 8: Frontend Model Loading Indicator UI (provides model status check)
