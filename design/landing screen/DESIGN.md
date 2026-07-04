---
name: Professional SaaS Identity
colors:
  surface: '#fcf8ff'
  surface-dim: '#dcd8e5'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2ff'
  surface-container: '#f0ecf9'
  surface-container-high: '#eae6f4'
  surface-container-highest: '#e4e1ee'
  on-surface: '#1b1b24'
  on-surface-variant: '#464555'
  inverse-surface: '#302f39'
  inverse-on-surface: '#f3effc'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#7e3000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#fcf8ff'
  on-background: '#1b1b24'
  surface-variant: '#e4e1ee'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-page:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-section:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  xxxl: 64px
---

## Brand & Style
The design system is rooted in the "Linear/Notion" aesthetic: a high-utility, low-friction environment that prioritizes content over container. The brand personality is **authoritative yet supportive**, designed to instill confidence in job seekers. 

The style utilizes a **Modern Minimalist** approach. It leans heavily on systematic whitespace, precise 1px borders, and a monochromatic foundation punctuated by a single strategic accent color. The goal is to create a "tool-like" atmosphere where the AI-driven optimizations feel surgical and reliable rather than experimental.

## Colors
The palette is built on a foundation of neutral grays to ensure high legibility and a professional "paper-like" quality. 

- **Primary Indigo:** Reserved for high-priority actions (Primary Buttons, Active States).
- **Secondary Teal:** Used specifically for "Optimization Success" indicators and AI-verified sections.
- **Surface Strategy:** Backgrounds use a subtle off-white to reduce eye strain, while active workspaces (cards/editors) use pure white to pop forward.
- **Semantic Colors:** Warning and Error hues are used sparingly for validation states and data-integrity alerts.

## Typography
This design system uses **Inter** for its systematic clarity and excellent legibility at small sizes. 

The hierarchy is intentionally flat; we avoid excessive font sizes to maintain the "SaaS dashboard" feel. 
- **Scale:** The base body size is 14px, which allows for higher information density in resume editing views.
- **Weight:** We use SemiBold (600) for headers to provide contrast against the Regular (400) body text without appearing too heavy.
- **Letter Spacing:** Headlines utilize slight negative tracking (-0.01em to -0.02em) to appear more cohesive in a digital interface.

## Layout & Spacing
The system follows a strict **8px grid**. All margins, paddings, and component heights must be multiples of 8 (or 4 for micro-adjustments).

- **The Layout:** A fixed-width centered grid (1280px) for desktop to prevent line lengths from becoming unreadable in the resume editor. 
- **The Editor View:** Uses a split-pane layout with a 1px vertical divider. The left pane (input) and right pane (preview) should both utilize `spacing.lg` for internal padding.
- **Responsiveness:** On mobile, margins shrink to 16px, and multi-column forms reflow to a single stack.

## Elevation & Depth
In line with the minimal aesthetic, this design system minimizes the use of heavy shadows. 

- **Level 0 (Flat):** Used for the main background.
- **Level 1 (Bordered):** Cards and sections use a 1px #E5E7EB border. This is the primary method of containment.
- **Level 2 (Soft Shadow):** Reserved for interactive elements like hover states on cards or dropdown menus. Use `0 1px 3px rgba(0,0,0,0.08)` to provide a "lifted" effect without breaking the clean aesthetic.
- **Level 3 (Overlay):** Modals and slide-overs use a slightly deeper shadow `0 10px 15px -3px rgba(0,0,0,0.1)` and a backdrop blur of 4px to maintain focus.

## Shapes
We use a **Rounded** geometric language. 
- **Components:** Buttons and inputs use an 8px (0.5rem) radius, providing a modern, approachable feel that isn't too "bubbly."
- **Containers:** Cards and large sections use a 12px (0.75rem) radius to soften the layout and distinguish them from smaller UI widgets.
- **Icons:** Use Lucide-style line icons with a 2px stroke width and slightly rounded caps to match the typography's softness.

## Components
- **Buttons:** 
  - *Primary:* Indigo background, white text, 8px radius. 
  - *Secondary:* White background, 1px gray-300 border, primary text.
  - *Ghost:* No background or border, secondary text, shifts to light gray on hover.
- **Inputs:** 1px border (#E5E7EB), 8px radius, 14px text. On focus, the border transitions to Primary Indigo with a 2px soft outer glow.
- **Cards:** White background, 1px border (#E5E7EB), 12px radius. Use for resume sections and AI insight modules.
- **Chips/Badges:** 9999px (Pill) radius. Use Secondary Teal for "Match Score" or "Keywords Found."
- **Lists:** Clean rows with 1px bottom borders. No bullets; use Lucide icons for semantic meaning (e.g., a checkmark for "Optimized").
- **Specialized Component - "Score Gauge":** A circular or linear progress bar using the Success Teal to visualize resume-job alignment.