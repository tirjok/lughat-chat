# Issue 7: Frontend Character Counter Ring

## What to build

Build the SVG circular progress ring that displays character count (0/500) in the top-left corner of the textarea. The ring fills proportionally as the user types, and changes color when approaching the limit.

After this is complete, users see a visual indicator of how many characters they've used — no validation or generation yet.

## Acceptance criteria

- [ ] SVG circular progress ring positioned in top-left corner of textarea
- [ ] Ring fills proportionally based on character count (0/500)
- [ ] Shows numeric counter "X/500 حرف" below the textarea
- [ ] Ring stroke color changes to red when count exceeds 400 characters
- [ ] Ring is hidden when textarea is empty
- [ ] Uses UnoCSS for styling (stroke colors, transitions)
- [ ] Smooth CSS transition on ring fill change

## Blocked by

- Issue 6: Frontend RTL Textarea Component
