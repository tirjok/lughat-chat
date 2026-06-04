# UnoCSS Implementation Guide

## Overview
UnoCSS has been successfully implemented in your Nuxt application. This guide explains the setup and how to use it.

## Files Created/Modified

### 1. `uno.config.ts` (Root)
Main UnoCSS configuration file with:
- **Presets**: presetUno, presetIcons, presetTypography, presetWebFonts
- **Shortcuts**: Reusable utility combinations (btn, card, flex-center, etc.)
- **Custom Rules**: Text gradient effect

### 2. `nuxt.config.ts`
Updated to include UnoCSS module configuration:
```typescript
unocss: {
  // Options will be read from uno.config.ts
}
```

### 3. `app/assets/css/main.css`
Added UnoCSS reset and global styles:
```css
@import 'unocss/reset';

body {
  @apply antialiased bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100;
}
```

### 4. `app/pages/index.vue`
Complete redesign using UnoCSS utilities:
- Responsive grid layouts
- Flexbox utilities
- Typography classes
- Color utilities (with dark mode support)
- Custom shortcuts (btn, card, flex-center)

### 5. `app/components/AppLogo.vue`
Enhanced with UnoCSS classes:
- Responsive sizing (`w-full h-auto`)
- Transition animations (`transition-all duration-300 hover:scale-105`)
- Dark mode colors (`text-gray-800 dark:text-white`)

## Available Utilities

### Core Presets
- **presetUno**: Tailwind-like utilities (spacing, colors, flexbox, grid, etc.)
- **presetIcons**: Icon support with `i-lucide-*` syntax
- **presetTypography**: Typography utilities for headings, paragraphs, etc.
- **presetWebFonts**: Google Fonts integration (Inter, Georgia, Fira Code)

### Custom Shortcuts
```html
<!-- Button -->
<button class="btn">Click me</button>

<!-- Card -->
<div class="card">Content here</div>

<!-- Flexbox utilities -->
<div class="flex-center">Centered content</div>
<div class="flex-between">Space between items</div>

<!-- Text gradient -->
<h1 class="text-gradient">Gradient text</h1>
```

### Icon Integration
Icons are available via the `i-` prefix:
```html
<i class="i-lucide-mic"></i>
<i class="i-lucide-volume-2"></i>
<i class="i-lucide-gauge"></i>
```

Or using nuxt-icon component:
```html
<LucideIcon name="mic" class="w-8 h-8 text-primary" />
```

## Dark Mode Support
UnoCSS supports dark mode out of the box using the `dark:` prefix:
```html
<div class="bg-white dark:bg-gray-800 text-black dark:text-white">
  Content
</div>
```

## Responsive Design
Use breakpoints like Tailwind CSS:
```html
<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
  <!-- Stacks on mobile, 3 columns on medium+ screens -->
</div>
```

## Adding New Utilities

### Custom Shortcuts
Edit `uno.config.ts`:
```typescript
shortcuts: {
  'my-custom-class': 'flex items-center justify-center p-4',
}
```

### Custom Rules
Add to the `rules` array in `uno.config.ts`:
```typescript
rules: [
  ['my-gradient', {
    'background': 'linear-gradient(45deg, #ff0000, #0000ff)',
  }],
]
```

## Performance Notes
- UnoCSS generates CSS on-demand (tree-shaking)
- Only used utilities are included in the final bundle
- No unused CSS bloat

## Next Steps
1. Explore more presets: https://unocss.dev/presets
2. Add custom icons with presetIcons
3. Create your own shortcuts for common patterns
4. Use the UnoCSS DevTools for inspection

## Troubleshooting

### Icons not showing
Make sure you have the icon preset configured and icons are installed:
```bash
pnpm add @iconify-json/lucide
```

### Styles not applying
1. Check that `uno.config.ts` is in the project root
2. Ensure `@unocss/nuxt` is in your modules array
3. Restart the dev server after config changes

### Dark mode not working
1. Ensure you have a dark mode toggle or system preference detection
2. Use the `dark:` prefix for dark mode styles
