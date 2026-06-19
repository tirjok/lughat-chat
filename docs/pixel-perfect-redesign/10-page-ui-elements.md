# 10 — pages/index.vue: Missing UI Elements

## Type

AFK

## What to build

Add the missing UI elements from the prototype that are not yet rendered in `pages/index.vue`. These are visual elements present in the prototype but absent from the current implementation.

### Prototype reference

`frontend/docs/new-design/lughat_chat_studio.html` — Header/Context section (lines ~320–350), Floating Shortcut Hint (lines ~355–360).

### Scope

**AI Smart Tools Toolbar**
- Prototype: Horizontal scrollable toolbar with 3 buttons, each with `✨` emoji prefix
- Buttons: "Translate", "Add Diacritics", "Continue Script"
- Styling: `flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white`
- Background: `bg-studio-800 hover:bg-studio-700 px-3 py-1.5 rounded-lg border border-studio-700`
- Hover border: color-coded per action (gray for translate, `sunrise-orange` for tashkeel, `sunrise-magenta` for continue)
- `overflow-x-auto hide-scrollbar pb-1 md:pb-0 md:pl-4 md:border-l border-studio-700 shrink-0`
- **TODO**: Create `AiToolbar` component (deferred to later phase — AI features)

**Keyboard Shortcut Hint**
- Prototype: `hidden md:flex absolute bottom-6 right-8`
- Content: `Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to generate`
- Styling:
  - Container: `bg-studio-800/80 backdrop-blur px-4 py-2 rounded-lg border border-studio-700/50`
  - `text-gray-600 text-sm font-medium items-center gap-2`
  - Kbd: `bg-studio-900 px-2 py-1 rounded border border-studio-700 font-mono text-gray-400 shadow-sm`
- **TODO**: Add to `pages/index.vue` — visible on desktop only (`hidden md:flex`)

**Clear Canvas Button**
- Prototype: Trash icon button next to character count
- Icon: `ph ph-trash text-lg`
- Text: `hover:text-white transition-colors p-1`
- Title: `Clear Canvas`
- **TODO**: Add to `pages/index.vue` — visible on both mobile and desktop (prototype has separate mobile/desktop versions)

**Character Count**
- Prototype: `text-sm text-gray-500 font-mono`
- Format: `0 / 3000` (amber at 80%, red when exceeded)
- **TODO**: Add color coding (amber at 80%, red when exceeded)

**Mobile Header**
- Prototype: Logo + status pill (matches existing `MobileStatusIndicator`)
- **Current**: Already implemented — no changes needed

**Page Layout Structure**
- Prototype: Two-panel layout with specific breakpoint widths
  - Left panel: `w-full md:w-[35%] lg:w-[30%] xl:w-[25%]`
  - Right panel: `flex-1`
  - Mobile: left panel `h-[45dvh]`, right panel `order-1`, left panel `order-2`
  - Desktop: left panel `order-1`, right panel `order-2`
  - **Current**: matches prototype — no changes needed

### Current issues vs prototype
- Missing AI toolbar (deferred)
- Missing keyboard shortcut hint (visible on desktop)
- Missing clear canvas trash icon (visible on mobile + desktop)
- Character count missing color coding (amber at 80%, red when exceeded)

## Acceptance criteria

- [ ] Keyboard shortcut hint visible on desktop: `bg-studio-800/80 backdrop-blur`, `border-studio-700/50`, `rounded-lg`
- [ ] Kbd elements: `bg-studio-900 px-2 py-1 rounded border border-studio-700 font-mono text-gray-400 shadow-sm`
- [ ] Clear canvas button with trash icon (`ph ph-trash`) visible on mobile + desktop
- [ ] Character count: amber at 80% (`text-amber-500`), red when exceeded (`text-red-400`)
- [ ] AI toolbar placeholder (deferred — AI features phase)

## Blocked by

- #01 (icon library — Phosphor trash icon)
- #02 (global styles)
- AI features phase (deferred — AI toolbar)
