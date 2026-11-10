---
name: SmartDroneInspection
description: NextAdmin-styled traceable enterprise drone inspection and maintenance workspace
colors:
  primary: "#3758F9"
  primary-dark: "#2237EE"
  primary-light: "#06B6D4"
  primary-soft: "#EFF3FF"
  harbor: "#18181B"
  harbor-light: "#52525B"
  neutral-bg: "#F4F4F5"
  inset-surface: "#FCFCFD"
  neutral-surface: "#FFFFFF"
  neutral-divider: "#E8E8E8"
  text-primary: "#18181B"
  text-secondary: "#52525B"
  text-tertiary: "#71717A"
  success: "#16A34A"
  warning: "#CA8A04"
  error: "#DC2626"
  info: "#0284C7"
  dark-canvas: "#09090B"
  dark-inset: "#111827"
  dark-surface: "#18181B"
  dark-raised: "#27272A"
  dark-text: "#F4F4F5"
  dark-muted: "#A1A1AA"
typography:
  display:
    fontFamily: 'Inter, "Inter Fallback", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: 'Inter, "Inter Fallback", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    fontSize: "1.625rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: 'Inter, "Inter Fallback", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0em"
  body:
    fontFamily: 'Inter, "Inter Fallback", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0em"
  label:
    fontFamily: 'Inter, "Inter Fallback", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.04em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-outlined:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
---

## Overview

SmartDroneInspection uses the **NextAdmin** visual architecture paired with the **Trace Ledger** inspection workflow: an evidence-first system where every capture, confirmed defect finding, and versioned report section connects in a verifiable audit trail. The design features a `#F4F4F5` outer canvas, a `270px` borderless sidebar, and a floating `#FCFCFD` inset workspace frame (`16px` radius) housing `#FFFFFF` cards (`12px` radius) with `#E8E8E8` borders.

## Colors

- **Canvas, Inset & Cards**: `#F4F4F5` outer canvas, `#FCFCFD` floating inset workspace, and `#FFFFFF` cards with `#E8E8E8` borders in light mode; `#09090B` outer canvas, `#111827` inset workspace, and `#18181B` cards with `#27272A` borders in dark mode.
- **NextAdmin Indigo (`#3758F9`)**: Primary action (`dark: #2237EE`, `light: #06B6D4`, `soft: #EFF3FF`).
- **Zinc Ink (`#18181B` / `#52525B` / `#71717A`)**: High-contrast primary, secondary, and tertiary typography.
- **Status Accents**: Reserved strictly for actual workflow states (`#16A34A` success, `#CA8A04` warning, `#DC2626` error, `#0284C7` informational guidance).

## Typography

- **Stack**: `'Inter, "Inter Fallback", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'` throughout all surfaces.
- **Ramp**:
  - H1 Page Title: `2.5rem` / `700` / `-0.03em`
  - H3 Section Headers: `1.625rem` / `700` / `-0.02em`
  - H6 Stage Titles: `1rem` / `600`
  - Body Text: `0.875rem` / `400` / `1.55` line-height
  - Micro-Labels & Badges: `0.75rem` / `600` with subtle tracking for field scanability.

## Layout

- **NextAdmin Shell**: `270px` left sidebar on the `#F4F4F5` canvas paired with a `16px`-rounded floating `#FCFCFD` right inset container and a `73px` sticky header bar.
- **Desktop Workflow Rail**: 7-stage horizontal readiness rail (`Flight Permit` → `Pre-flight Check` → `Flight Operation` → `Post-flight & Items` → `Field Evidence` → `Defect Findings` → `Inspection Report`) with accessible route navigation (`aria-current="step"`) and direct clickability.
- **Phone Viewport (390px)**: Compact step counter (`Step X / Y · State`) accompanied by a horizontal numbered selector that avoids multi-row clutter.

## Elevation & Depth

- **Tonal Layering**: Clean neutral surfaces with `#E8E8E8` (`1px solid var(--mui-palette-divider)`) borders and NextAdmin micro-elevation on the floating inset frame (`0 3px 6px -2px rgba(0,0,0,0.02), 0 1px 1px 0 rgba(0,0,0,0.04)`).
- **Hierarchy**: Distinction is created through typography, whitespace, and natural component nesting rather than decorative colored outlines.

## Shapes

- **Controls**: `8px` (`rounded.md`) on buttons, inputs, and action triggers.
- **Compact Chips & Badges**: `6px` (`rounded.sm`) for keyboard shortcut badges and state chips.
- **Cards & Panels**: `12px` (`rounded.lg`) with crisp `1px solid #E8E8E8` outlines.
- **Floating Workspace Frame**: `16px` (`rounded.xl`) on desktop viewports.

## Anti-AI UI & Enterprise Quality Standard

Refer to `UI_QUALITY_STANDARD.md` for explicit coding rules against amateur AI-generated design patterns:
- **No Card-Soup:** Do not nest Cards inside Cards. Use flat border-divided tables and key-value sections.
- **Crisp NextAdmin Radii:** Cards use `12px` (`rounded.lg`) and controls use `8px` (`rounded.md`).
- **No Decorative Gradients on Cards:** Workspace cards, buttons, and panels use crisp solid colors.
- **Zero Blurry Card Shadows:** Prefer border-only separation (`1px solid var(--mui-palette-divider)`) with `boxShadow: 'none'` on data cards.

## Components

- **Stage Rail**: Accessible `nav` element containing direct route links (`trace-stage-link`), readiness state icons (numbers or Check icon), and blocked-prerequisite tooltips.
- **Findings Workspace**: Progressive disclosure exposing primary search controls while placing secondary filters behind a "More filters" accordion.
- **Report Guard Dialog**: React Router data-router blocker triggered by dirty authoring state, offering explicit `Stay here` and `Discard edits` options.
- **Save Status**: Live polite status indicator (`Unsaved changes` / `All changes saved`).

## Do's and Don'ts

- **Do** keep all seven workflow stages directly navigable; explain blockers via informational callouts without disabling link access.
- **Do** distinguish recorded permit documents from legal flight authorization.
- **Do** require explicit Inspector confirmation before treating defect proposals as report findings.
- **Don't** use generic multi-card wizard containers or hard offset shadows.
- **Don't** use decorative gradients or colored border callouts that disguise component hierarchy.
