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
- `--logi-paper`: oklch(0.12 0.015 128)
- `--logi-paper-2`: oklch(0.16 0.018 128)
- `--logi-surface`: oklch(0.19 0.018 128)
- `--logi-ink`: oklch(0.96 0.006 120)
- `--logi-muted`: oklch(0.72 0.018 128)
- `--logi-rule`: oklch(0.36 0.018 128 / 0.55)
- `--logi-accent`: oklch(0.78 0.12 158)
- `--logi-accent-strong`: oklch(0.68 0.14 156)
- `--logi-risk`: oklch(0.78 0.12 78)
- `--logi-danger`: oklch(0.66 0.18 28)
- `--logi-focus`: oklch(0.86 0.11 154)

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
- Dark paper, route-green primary, amber risk, red only for destructive states.
- Geist font stack.
- Compact command-board density.
- Buttons and rows with specific transitions, never broad cinematic motion.

## Hallmark Stamp
`/* Hallmark - genre: modern-minimal - macrostructure: Workbench - design-system: design.md - designed-as-app */`
