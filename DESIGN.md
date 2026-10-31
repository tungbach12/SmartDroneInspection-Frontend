---
name: SmartDroneInspection
description: Traceable enterprise drone inspection and maintenance ledger
colors:
  primary: "#5750F1"
  primary-dark: "#463EC5"
  primary-light: "#7B75F5"
  primary-soft: "#EEF2FF"
  harbor: "#17364A"
  harbor-light: "#234C62"
  neutral-bg: "#F7F9FA"
  neutral-surface: "#FFFFFF"
  neutral-divider: "#D9E2E6"
  text-primary: "#253746"
  text-secondary: "#5D707B"
  success: "#176B52"
  warning: "#8C520B"
  error: "#A8323B"
  info: "#225F85"
  dark-canvas: "#0B0F17"
  dark-surface: "#111827"
  dark-raised: "#1E293B"
  dark-text: "#F1F5F9"
  dark-muted: "#94A3B8"
typography:
  display:
    fontFamily: '"Geist Sans", "Helvetica Neue", Arial, sans-serif'
    fontSize: "2.5rem"
    fontWeight: 650
    lineHeight: 1.1
    letterSpacing: "-0.045em"
  headline:
    fontFamily: '"Geist Sans", "Helvetica Neue", Arial, sans-serif'
    fontSize: "1.625rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: '"Geist Sans", "Helvetica Neue", Arial, sans-serif'
    fontSize: "1rem"
    fontWeight: 620
    lineHeight: 1.4
    letterSpacing: "0em"
  body:
    fontFamily: '"Geist Sans", "Helvetica Neue", Arial, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0em"
  label:
    fontFamily: '"Geist Sans", "Helvetica Neue", Arial, sans-serif'
    fontSize: "0.75rem"
    fontWeight: 650
    lineHeight: 1.5
    letterSpacing: "0.04em"
rounded:
  sm: "5px"
  md: "8px"
  lg: "10px"
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

SmartDroneInspection uses **Trace Ledger** for the inspection workflow: an evidence-first system where every capture, confirmed defect finding, and versioned report section connects in a verifiable audit trail. The design emphasizes operational truth over decorative chrome, maintaining familiar Material UI interaction patterns while surfacing clear workflow readiness and human accountability.

## Colors

- **Canvas & Paper**: `#F7F9FA` background with `#FFFFFF` surfaces in light mode; `#0B0F17` carbon canvas with `#111827` elevated cards in dark mode.
- **Tidal Teal (`#5750F1`)**: Primary action and active-stage indicator.
- **Harbor Slate (`#17364A` / `#253746`)**: High-contrast body and heading ink for technical readability.
- **Status Accents**: Reserved strictly for actual workflow states (`#176B52` success, `#8C520B` warning, `#A8323B` error, `#225F85` informational guidance).
- **Audit Trace**: Subtle 1px color-mixed divider lines linking mission records, evidence counts, findings confirmation, and report version tokens.

## Typography

- **Stack**: `"Geist Sans", "Helvetica Neue", Arial, sans-serif` throughout all surfaces.
- **Ramp**:
  - H1 Page Title: `2.5rem` / `650` / `-0.045em`
  - H3 Section Headers: `1.625rem` / `650` / `-0.025em`
  - H6 Stage Titles: `1rem` / `620`
  - Body Text: `0.875rem` / `400` / `1.55` line-height
  - Micro-Labels & Badges: `0.75rem` / `650` with subtle tracking for field scanability.

## Layout

- **Desktop Shell**: 4-stage horizontal readiness rail (`Field session` → `Evidence` → `Findings` → `Report draft`) with accessible route navigation (`aria-current="step"`) and direct clickability.
- **Phone Viewport (390px)**: Compact step counter (`Step X / Y · State`) accompanied by a horizontal numbered selector that avoids multi-row clutter.
- **Stage Container**: Max-width bounded with contextual header, asset badge, permit record caveat, and record trace summary.

## Elevation & Depth

- **Tonal Layering**: Clean neutral surfaces with standard subtle divider borders (`1px solid var(--mui-palette-divider)`); colored top borders, zero-blur block shadows, and decorative blur effects are prohibited.
- **Hierarchy**: Distinction is created through typography, whitespace, and natural component nesting rather than decorative colored outlines.

## Shapes

- **Controls**: `8px` (`rounded.md`) on buttons and standard action triggers.
- **Compact Chips & Steps**: `5px` (`rounded.sm`) for phone step controls and state chips.
- **Panels & Dialogs**: `10px` (`rounded.lg`) to `16px` (`rounded.xl`) with crisp outlines.

## Components

- **Stage Rail**: Accessible `nav` element containing direct route links (`trace-stage-link`), readiness state icons (numbers or Check icon), and blocked-prerequisite tooltips.
- **Findings Workspace**: Progressive disclosure exposing primary search controls while placing secondary filters behind a "More filters" accordion.
- **Report Guard Dialog**: React Router data-router blocker triggered by dirty authoring state, offering explicit `Stay here` and `Discard edits` options.
- **Save Status**: Live polite status indicator (`Unsaved changes` / `All changes saved`).

## Do's and Don'ts

- **Do** keep all four stages directly navigable; explain blockers via informational callouts without disabling link access.
- **Do** distinguish recorded permit documents from legal flight authorization.
- **Do** require explicit Inspector confirmation before treating defect proposals as report findings.
- **Don't** use generic multi-card wizard containers or hard offset shadows.
- **Don't** use decorative gradients or colored border callouts that disguise component hierarchy.
