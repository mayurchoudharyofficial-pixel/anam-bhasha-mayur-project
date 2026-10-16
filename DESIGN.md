---
name: Pixel Peeper
description: A quiet, precise inspector that floats over any website. Linear's system, light.
source: "Adapted from the Linear DESIGN.md in VoltAgent/awesome-design-md (MIT). Light variant, Pixel Peeper semantics added."
colors:
  canvas: "#f7f8f8"
  surface: "#ffffff"
  surface-sunk: "#f2f3f5"
  hover: "#f2f3f5"
  ink: "#1b1c1f"
  ink-2: "#3c3f44"
  muted: "#6b6f76"
  subtle: "#8a8f98"
  hairline: "#e6e7ea"
  hairline-strong: "#d5d7dc"
  primary: "#5e6ad2"
  primary-hover: "#4e5ac4"
  primary-soft: "#eef0fc"
  on-primary: "#ffffff"
  selection: "#5e6ad2"
  measured: "#17804a"
  measured-bg: "#e6f5ec"
  inferred: "#9a5408"
  inferred-bg: "#fdf1e2"
  fail: "#c0362c"
  fail-bg: "#fdeceb"
  mascot-yellow: "#f5c84c"
typography:
  display:
    fontFamily: Inter
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: Inter
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  lesson-headline:
    fontFamily: Inter
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  body:
    fontFamily: Inter
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Inter
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.04em"
  value:
    fontFamily: JetBrains Mono
    fontSize: "12px"
    fontWeight: 500
    fontFeature: tabular-nums
rounded:
  chip: "6px"
  button: "8px"
  card: "12px"
  window: "14px"
  pill: "99px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.button}"
  button-quiet:
    backgroundColor: transparent
    textColor: "{colors.ink-2}"
    rounded: "{rounded.button}"
  measured-label:
    backgroundColor: "{colors.measured-bg}"
    textColor: "{colors.measured}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
  inferred-label:
    backgroundColor: "{colors.inferred-bg}"
    textColor: "{colors.inferred}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
  floating-window:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.window}"
    width: "390px"
---

# Design System: Pixel Peeper

## Overview

**North star: "The quiet inspector."** Pixel Peeper floats over someone else's website, so it must be calm, precise and unmistakably separate from the page underneath. The system is adapted from Linear's DESIGN.md (VoltAgent/awesome-design-md, MIT) and flipped to light: cool neutrals, hairlines, one lavender-blue accent, and no decoration that competes with the website being studied.

Personality comes from one place only: the detective. Everything else stays out of the way so a lesson can be read in under a minute.

**Key characteristics**
- White sheets on a cool off-white canvas; depth from shadow borders, not solid lines.
- One accent, `primary` indigo, for every action and for the selection outline on the page.
- Two meaning colours that the whole product rests on: green **Measured**, amber **Inferred**. Always paired with the word.
- Inter for all interface text, JetBrains Mono for measured values.
- The detective (black, white, mascot yellow) is the only playful element.

## Colors

- **Primary (indigo):** the main action on each surface, the selection outline and tag, focus rings, progress. One primary button per view.
- **Neutrals:** `ink` for reading, `ink-2` for secondary text and quiet buttons, `muted` and `subtle` for metadata and labels, `hairline` for separators.
- **Measured (green):** facts read from the page by code.
- **Inferred (amber):** the AI's interpretation. Amber was chosen so it can never be confused with the indigo actions.
- **Fail (red):** failing rules and errors only.
- **Mascot yellow:** the detective's eyes and celebration pixels. Never a button.

**The Evidence Label Rule.** Colour never carries provenance alone: every Measured or Inferred claim shows the word.

## Typography

Inter (bundled, SIL OFL) for everything; Linear's own face is not distributed and its DESIGN.md names Inter as the closest free substitute. JetBrains Mono (bundled, SIL OFL) for measured values, tags and code. Headings are semibold with tight tracking; body text stays at 13.5 to 15px. Labels are 11px semibold with slight positive tracking.

The in-page overlay registers the same files under private names ("PP Inter", "PP Mono") so a website that names Inter in its own CSS keeps rendering exactly as before.

## Layout

The overlay never reserves width: the detective, toolbar and lesson window float above the page. The lesson window is 390px wide and movable. Library and onboarding use a centred column with a 16px minimum gutter and are checked at 1440px and 375px.

## Elevation & Depth

Floating objects use a shadow border plus a soft lift: `0 0 0 1px rgb(15 16 18 / .07), 0 1px 2px rgb(15 16 18 / .05), 0 16px 40px -12px rgb(15 16 18 / .22)`. Content inside a sheet stays flat, separated by hairlines or a sunk surface with a 1px ring.

## Shapes

Chips 6px, buttons 8px, cards 12px, the lesson window 14px, pills only for status counts and the onboarding progress.

## Components

- **Buttons:** primary indigo with white text and a faint inner highlight; quiet buttons are text on transparent with a hover fill. Every pressable element scales to .97 on press.
- **Lesson window:** header with the detective mark and Hide; title, metadata, tabs with a settling underline; footer with quiet actions left and the one primary action right.
- **Rules list:** a coloured dot and status word, not a stretched pill. Summary counts keep compact chips.
- **Measurements:** label and value grid; colours shown as `#RRGGBB` with a swatch, opacity as a percentage when not solid.
- **Selection on the page:** 1.5px indigo outline, soft ring, mono tag with tabular numerals.

## Motion

Following Emil Kowalski's design engineering rules (emilkowalski/skills, `emil-design-eng`):

- Enter and exit use ease-out `cubic-bezier(.23, 1, .32, 1)`; movement on screen uses ease-in-out `cubic-bezier(.77, 0, .175, 1)`. Never ease-in.
- Interface animations stay under 300ms: presses 150ms, popovers and dock 200ms, the lesson window 220ms. Exits are quicker than entrances.
- Nothing appears from `scale(0)`; popovers start at `scale(.97)` from their trigger's corner.
- Hover effects are gated to `(hover: hover) and (pointer: fine)`.
- Keyboard-triggered actions are not animated.
- Onboarding is rare and first-time, so it may delight: a product demo, staggered arrivals, one damped spring for the detective, a pixel burst on Done.
- Reduced motion removes movement and loops but keeps opacity and colour changes so state stays visible.

## Do's and Don'ts

- **Do** keep one primary action per view, in indigo.
- **Do** show Measured and Inferred as words, in green and amber.
- **Do** use shadow borders on floating surfaces.
- **Do** keep the detective in the launcher, onboarding, save moment and empty states.
- **Don't** use yellow for buttons; it belongs to the mascot.
- **Don't** put artwork inside measurements or lesson results.
- **Don't** let any overlay style or font leak into the inspected website.
