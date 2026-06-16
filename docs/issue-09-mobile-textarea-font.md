# Issue 9: Mobile Textarea Font Size

## What to build

Update the mobile textarea font size to match the reference prototype. The PRD text says "middle ground (between `text-2xl` and `text-3xl`)" but the actual reference prototype HTML uses `text-2xl md:text-4xl lg:text-5xl leading-relaxed md:leading-[1.6]`.

Reference prototype textarea:
```html
<textarea 
    id="arabic-input" 
    dir="rtl" 
    class="w-full h-full bg-transparent border-none outline-none resize-none font-arabic text-2xl md:text-4xl lg:text-5xl leading-relaxed md:leading-[1.6] text-gray-200 placeholder-gray-700 scroll-smooth z-10"
    placeholder="اكتب النص هنا... مثال: السلام عليكم ورحمة الله وبركاته"
></textarea>
```

Current code: `text-3xl md:text-5xl leading-relaxed` — no `lg:text-5xl`, no `md:leading-[1.6]`, mobile is `text-3xl` instead of `text-2xl`.

## Acceptance criteria

- [ ] Mobile (<768px): `text-2xl` (from reference prototype — 24px, smaller than current `text-3xl` at 36px)
  - Reference prototype explicitly uses `text-2xl` for mobile (not a "middle ground" — the PRD text was slightly off)
- [ ] Desktop (≥768px): `md:text-4xl` (from reference prototype — 32px, smaller than current `md:text-5xl` at 64px)
- [ ] Large desktop (≥1024px): `lg:text-5xl` (from reference prototype — 64px)
- [ ] Line height: `leading-relaxed` universally, `md:leading-[1.6]` on desktop (from reference prototype — adds extra line height for desktop readability)
- [ ] Current code: `text-3xl md:text-5xl leading-relaxed` — needs updating to `text-2xl md:text-4xl lg:text-5xl leading-relaxed md:leading-[1.6]`
- [ ] Arabic text with diacritics (harakat) remains readable at the smaller mobile size
- [ ] No horizontal scrolling on narrow screens (375px) — text wraps naturally
- [ ] No tests assert on the old `text-3xl` mobile value (update if needed)

## Blocked by

- Issue 1 (layout foundation: 45dvh Control Deck determines the reduced Canvas space on mobile)
