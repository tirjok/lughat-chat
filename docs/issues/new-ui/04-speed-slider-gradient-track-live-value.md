## Type

AFK

## What to build

Build a `SpeedSlider` component that replaces the basic range input with a visually rich gradient track slider. The component features:

- **Gradient track fill** that fills proportionally from left to right as the user adjusts the value — colored magenta (#DD2476) to orange (#FF512F)
- **Live speed value display** shown as "1.0x" in a monospace badge next to the slider
- **Range**: 0.5x to 2.0x, default 1.0x, step 0.1
- Track fills proportionally based on the current value (JavaScript sets a CSS gradient variable)

The component must be visually satisfying and responsive, with smooth animations on value changes.

## Acceptance criteria

- [ ] Gradient track fills proportionally from magenta (#DD2476) to orange (#FF512F) based on current value
- [ ] Live speed value displayed as "1.0x" in a monospace-styled badge next to the slider
- [ ] Range is 0.5x to 2.0x with step 0.1
- [ ] Default value is 1.0x
- [ ] Track fills update smoothly as user drags the slider
- [ ] Tests: value reflects slider position, "1.0x" display updates with value, range constraints enforced (0.5x–2.0x)

## Blocked by

None - can start immediately
