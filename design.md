# Design - LogiTrack

A locked Hallmark design system for the LogiTrack app. Every page should read
as the same operations product: inventory, routing, dispatch, customer orders,
and field delivery in one shared visual language.

## Genre
modern-minimal

## Macrostructure Family
- Marketing/home page: Workbench command board with live operational surfaces.
- App pages: Workbench dashboards with dense panels, status rows, and visible data.
- Content pages: Not currently present.

## Theme
- `--logi-paper`: oklch(14% 0.008 40)
- `--logi-paper-2`: oklch(18% 0.010 40)
- `--logi-surface`: oklch(22% 0.010 40)
- `--logi-ink`: oklch(94% 0.006 40)
- `--logi-muted`: oklch(72% 0.006 40)
- `--logi-rule`: oklch(30% 0.008 40)
- `--logi-accent`: #FC4C02
- `--logi-accent-strong`: oklch(65% 0.19 55)
- `--logi-risk`: #FC4C02
- `--logi-danger`: oklch(66% 0.18 28)
- `--logi-focus`: oklch(70% 0.19 55)

## Typography
- Display: Geist, weight 800-900, normal.
- Body: Geist, weight 400-700.
- Mono: Geist Mono for IDs, currency, coordinates, and compact telemetry.
- Display tracking: 0.
- Type scale anchor: compact dashboard scale; no oversized marketing type inside app panels.

## Spacing
4-point rhythm. Dense app panels use 8, 12, 16, 24, and 32 px spacing.

## Motion
- Easing: `--logi-ease-out: cubic-bezier(0.16, 1, 0.3, 1)`.
- Reveal pattern: one entrance pass for primary surfaces.
- Microinteractions: press feedback, focused rings, row/card affordance.
- Reduced motion: no spatial movement.

## CTA Voice
- Primary: filled route-green controls, 7-8 px radius, short operational copy.
- Secondary: hairline surface controls, same radius, muted text.

## What Pages Must Share
- Dark midnight paper, signal orange primary, red only for destructive states.
- Geist font stack.
- Compact command-board density.
- Buttons and rows with specific transitions, never broad cinematic motion.

## Hallmark Stamp
`/* Hallmark - genre: modern-minimal - macrostructure: Workbench - design-system: design.md - designed-as-app */`
