# Issue 10: Frontend Character Counter Ring

## What to build

A circular SVG progress ring that visually displays the character count (0/500) with proportional fill animation.

## Acceptance criteria

- [ ] SVG ring positioned in the top-left corner of the textarea
- [ ] Ring circumference represents 500 characters (max)
- [ ] Stroke-dashoffset updates proportionally as user types
- [ ] Ring color is blue when under 80% full, turns red at 100%
- [ ] Character count text displayed below the ring: "X/500 حرف"
- [ ] Ring is hidden when textarea is empty
- [ ] Smooth CSS transition on stroke-dashoffset change

## Blocked by

- Issue 9: Frontend RTL Textarea Component (provides the textarea to attach ring to)
