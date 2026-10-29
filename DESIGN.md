> Historical PresencePal document retained for reference. MyGamesThing architecture and current behavior are documented in README.md.

---
name: PresencePal
description: Set your Discord game activity to any game — mobile titles included.
colors:
  ice-channel: "#00c2ff"
  ice-channel-deep: "#00a8dd"
  live-green: "#00e676"
  stop-red: "#f23f42"
  scan-amber: "#f0b429"
  code-blue: "#4a9eff"
  depth-black: "#0d0d0f"
  studio-dark: "#161618"
  elevated-surface: "#1e2024"
  subtle-border: "#2a2d33"
  primary-text: "#e8e9ea"
  dim-text: "#c8cdd4"
  muted-text: "#4a4f57"
  brand-gray: "#8b8f96"
typography:
  display:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "28px"
    fontWeight: 700
    letterSpacing: "-0.5px"
    lineHeight: 1.2
  headline:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "10px"
    fontWeight: 700
    letterSpacing: "0.1em"
    lineHeight: 1.2
  mono:
    fontFamily: "'Consolas', 'Courier New', monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "10px"
  full: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ice-channel}"
    textColor: "#000000"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.ice-channel-deep}"
  button-primary-active:
    backgroundColor: "{colors.live-green}"
    textColor: "#000000"
  button-stop:
    backgroundColor: "{colors.elevated-surface}"
    textColor: "{colors.stop-red}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "0 22px"
  input-search:
    backgroundColor: "{colors.elevated-surface}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.lg}"
    padding: "7px 10px"
  input-search-focus:
    backgroundColor: "{colors.elevated-surface}"
    textColor: "{colors.primary-text}"
  game-item:
    backgroundColor: "transparent"
    textColor: "{colors.dim-text}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 10px"
  game-item-hover:
    backgroundColor: "{colors.elevated-surface}"
    textColor: "{colors.primary-text}"
  game-item-active:
    backgroundColor: "rgba(0,194,255,0.09)"
    textColor: "{colors.primary-text}"
  stat-box:
    backgroundColor: "{colors.elevated-surface}"
    rounded: "{rounded.lg}"
    padding: "13px 16px"
---

# Design System: PresencePal

## 1. Overview

**Creative North Star: "The Signal Monitor"**

PresencePal is a status instrument, not a dashboard. Its job is to read state at a glance and execute actions in under ten seconds. Every design decision derives from that constraint: what earns screen space must communicate something, and what does not communicate is removed. The aesthetic is calibrated, not styled — like a rack-mounted hardware monitor or a well-configured terminal, the surface is functional by nature.

The palette is near-monochrome by design. Three dark backgrounds form a quiet depth stack; color appears only where state demands it. Ice Channel cyan marks the live path — focused input, active selection, the brand word that means "this works." Green means running. Amber means scanning. Red means stop. These four colors are information, not decoration, and they carry that responsibility exclusively.

The app lives beside Discord all day. It is designed to look like it belongs to a different, quieter category — not a Discord plugin, not a gaming tool, not a SaaS interface. The frame is invisible; the status is everything.

**Key Characteristics:**
- Near-monochrome dark field with four semantic state colors
- Status-first: running indicators, elapsed timers, and scanning feedback are the primary visual hierarchy
- 44px as the universal touch target across game items, launch, and stop
- No decorative chrome; every element is functional or absent
- System-UI typography at neutral weight — readable, zero branding overhead

## 2. Colors: The Signal Palette

Four semantic colors on a near-monochrome dark field. Color is reserved for state and identity; it never decorates.

### Primary
- **Ice Channel** (`#00c2ff`): The single accent color. Marks the active path: focused inputs, selected list items (as an inset-left edge glow), the "Pal" in the wordmark, and the Launch button at rest. Its rarity is the point.
- **Ice Channel Deep** (`#00a8dd`): Hover state of Ice Channel. Never used independently; always the -hover variant.

### Secondary
- **Live Green** (`#00e676`): Active/running state only. The Launch button turns this color when a game is active; a 6px dot in this color marks the running list item. Does not appear anywhere else.
- **Stop Red** (`#f23f42`): Destructive and terminal actions — the Stop button text, the window close control, error messages. Appears on a dark surface so it reads as controlled, not alarming.
- **Scan Amber** (`#f0b429`): Transitional state: the scanning dot animation while Discord registers the game, and the minimize window control. Never for decoration.
- **Code Blue** (`#4a9eff`): The `.exe` filename badge in the game header only. Distinct from Ice Channel because this is a data tag, not an interactive element.

### Neutral
- **Depth Black** (`#0d0d0f`): The main canvas. Slightly tinted — not pure black.
- **Studio Dark** (`#161618`): Sidebar and titlebar backgrounds; the first tonal lift.
- **Elevated Surface** (`#1e2024`): Inputs, stat boxes, hovered game items; the second tonal lift. Also the value of `--border`, creating invisible divisions that are felt but not seen.
- **Subtle Border** (`#2a2d33`): Visible borders on interactive elements — focused inputs, modal frame, stop button. The only border that registers as a line.
- **Primary Text** (`#e8e9ea`): Active text, game view title, high-emphasis values.
- **Dim Text** (`#c8cdd4`): Default game list names, secondary context. One step down from primary.
- **Muted Text** (`#4a4f57`): Labels, placeholders, idle states. Near-invisible on dark surfaces by design.
- **Brand Gray** (`#8b8f96`): The "Presence" half of the wordmark — muted so "Pal" (Ice Channel) reads as the active half.

### Named Rules
**The One Voice Rule.** Ice Channel is the only accent. It carries the active path, the brand word, and focused state. Any other use dilutes the signal. When in doubt, use Muted Text, not the accent.

**The Four-Color Doctrine.** Status is expressed in exactly four colors: Cyan (active path), Green (running), Amber (scanning), Red (stop). No other color encodes state. A new state must map to one of these four or the doctrine must be explicitly revised.

## 3. Typography

**Body / UI Font:** system-ui, -apple-system, 'Segoe UI', sans-serif
**Mono Font:** 'Consolas', 'Courier New', monospace (exe badges and elapsed timers only)

**Character:** System-UI with zero personality overhead. The font is neutral infrastructure. Hierarchy is established through size and weight alone — no decorative faces, no variable-font expression, no text that announces itself.

### Hierarchy
- **Display** (700, 28px, letter-spacing -0.5px, line-height 1.2): Empty state wordmark only. The largest type in the app; appears once to orient the user when nothing is selected.
- **Headline** (700, 20px, line-height 1.2): Game title in the detail view. The name of what you are about to launch.
- **Title** (700, 17px, line-height 1.3): Modal headings. One per modal.
- **Body** (400-600, 14px, line-height 1.5): Button labels (600), stat values (600), general interface text (400). The workhorse scale.
- **Label** (700, 10px, letter-spacing 0.1em, uppercase): Section headings in the sidebar and stat box labels. All-caps with tracking marks metadata, not content.
- **Mono** (400, 11-13px, line-height 1.4): Exe badge chips and tabular-numeric elapsed timers. The only place Consolas appears; it marks data that might be copied, not read.

### Named Rules
**The Mono Boundary Rule.** Monospace appears only for technical data the user might copy: exe filenames and elapsed time digits. It does not appear in nav labels, headings, or button text.

## 4. Elevation

PresencePal has no box-shadows on surfaces. Depth is expressed entirely through tonal layering: three background values step from darker (main canvas `#0d0d0f`) to lighter (sidebar/titlebar `#161618`) to surface (inputs/cards `#1e2024`). The eye reads these as depth without any shadow being cast.

The one exception is the Launch button's hover state: a faint `0 2px 12px rgba(0,194,255,0.15)` glow. This is not structural elevation — it is a state signal, reserving a visible lighting effect for the single most important interactive moment.

### Shadow Vocabulary
- **Launch hover glow** (`box-shadow: 0 2px 12px rgba(0,194,255,0.15)`): Hover state on the primary action button only. Communicates "press this." Never reused elsewhere.
- **Active inset marker** (`box-shadow: inset 2px 0 0 #00c2ff`): Left-edge state indicator on the active game list item. Layout-stable: uses inset shadow, not border-left, so item width never shifts.
- **Modal scrim** (`background: rgba(0,0,0,0.65)`): Overlay behind the Add Custom Game modal. Sufficient to separate the modal plane without crushing the underlying UI.

### Named Rules
**The Tonal Lift Rule.** New surfaces are expressed by stepping one level up the bg ramp (depth-black → studio-dark → elevated-surface). Shadows are prohibited as a depth mechanism. The only allowed shadow is the launch hover glow, which is state feedback, not elevation.

## 5. Components

### Buttons
- **Shape:** Gently rounded (8px radius — `{rounded.lg}`)
- **Primary (Launch):** Ice Channel background (`#00c2ff`), black text, 44px height, full-width flex within the launch area. The only cyan-background element in the UI.
- **Primary Active (Running):** Becomes Live Green (`#00e676`) when a game process is active. No animation, no pulse — the color change is the entire state signal.
- **Primary Hover:** Darkens to Ice Channel Deep (`#00a8dd`) with the launch hover glow. No scale, no translate.
- **Stop (Destructive Ghost):** Elevated Surface background (`#1e2024`) with a 1px Subtle Border, Stop Red text (`#f23f42`). 44px height, fixed width. Appears only alongside the active Launch button.
- **Titlebar Controls:** 26px circles, `{rounded.full}`. Scan Amber for minimize, Stop Red for close. Reduce opacity on hover (`0.8`) instead of color shift.
- **Add Custom (Dashed):** Full width, transparent background, 1px dashed Elevated Surface border, Muted Text label. Hover: border becomes a faint Ice Channel tint, text becomes Ice Channel.

### Inputs / Fields
- **Style:** Elevated Surface background (`#1e2024`), 1px Subtle Border (`#2a2d33`), 8px radius, placeholder in Muted Text.
- **Focus:** Border shifts to Ice Channel (`#00c2ff`). No glow, no shadow — border-color transition only (0.15s).
- **Search input:** 13px body font, 7px/10px padding. Full-width in the sidebar header.
- **Modal inputs:** 13px body font, 9px/12px padding.
- **Exe dropdown:** appearance-none with an inline SVG chevron in Muted Text. Follows the same border-focus treatment as text inputs.

### Cards / Containers
- **Stat Boxes:** Elevated Surface background, 1px solid at `--border` (invisible, same value as bg3), 8px radius, 13px/16px internal padding. 2-column grid with 12px gap. No shadows.
- **Modal:** Studio Dark background, 1px Subtle Border, 8px radius, 420px fixed width, 24px internal padding, 14px vertical gap between fields.
- **Sidebar panel:** Studio Dark background, 220px fixed width. Separated from main content by a 1px Subtle Border right edge — not a shadow, a seam.

### Navigation / Game List
- **Game Items:** 44px height, 6px radius (one step smaller than cards), 1px vertical margin, 6px horizontal margin. Default state is transparent background.
- **Hover:** Background becomes Elevated Surface; game name brightens to Primary Text.
- **Active State:** Ice Channel tint background (`rgba(0,194,255,0.09)`) with an `inset 2px 0 0 #00c2ff` left-edge marker. Text brightens to white.
- **Running Indicator:** 6px Live Green dot, absolutely positioned at the item's right edge, vertically centered. The only in-list color element.
- **Game Avatars:** 28px (sidebar list) and 56px (detail header). Corners at 6px and 10px respectively. Deterministic color/letter avatars — the Discord API returns no icon hashes, so a 10-color dark-tint set is used (navy, indigo, forest, brown, plum, teal, rust, olive, midnight, earth) with white text at 0.75 opacity.

### Signature Component: Exe Badge
A monospace chip below the game title in the detail header. Depth Black background (`#0d0d0f`), 1px Elevated Surface border (`#1e2024`), 4px radius (`{rounded.sm}`), Code Blue text (`#4a9eff`), 11px Consolas. It reads as a code annotation embedded in the UI, not a label. The distinct blue and monospace face mark it as copyable data.

### Status Dot
A 6px circle that communicates detection state: Muted Text (idle), Live Green (running, solid), Scan Amber (scanning, `opacity` pulse at 0.7s). The dot appears before a text label in the stat box; color and label work together as a unit. The opacity pulse is the only ambient animation in the UI; gate it with `prefers-reduced-motion`.

## 6. Do's and Don'ts

### Do:
- **Do** use Ice Channel only where the user is told "this is the active path" — focused inputs, selected game items, the Launch button, the "Pal" wordmark.
- **Do** express elevation through the three-step tonal ramp (depth-black → studio-dark → elevated-surface). No shadows on surfaces at rest.
- **Do** keep all interactive targets at 44px height — game items, Launch, Stop, modal action buttons.
- **Do** use the four semantic state colors (Cyan, Green, Amber, Red) to communicate exactly one concept each, never for decoration.
- **Do** use `box-shadow: inset 2px 0 0 #00c2ff` for left-edge state markers so item width never shifts.
- **Do** use Consolas exclusively for exe filenames and elapsed time digits.
- **Do** keep transitions at 0.1-0.15s with ease-out easing. State changes are immediate feedback, not choreography.
- **Do** gate the scan dot opacity animation behind `prefers-reduced-motion: reduce`. It is the only ambient loop in the UI.

### Don't:
- **Don't** add blurple, pill buttons, or server-sidebar layouts. PresencePal works beside Discord, not inside it.
- **Don't** use neon gradients, glow grids, or Razer-style visual noise. The user's gaming setup is already loud — this app is the calm instrument they reach for.
- **Don't** apply hero metrics, big-number stat cards with gradient accents, or Figma-template card grids. No generic SaaS dashboard patterns.
- **Don't** use `border-left` greater than 1px as a colored stripe accent. Use inset box-shadow or tinted background instead.
- **Don't** use gradient text (`background-clip: text` with a gradient). Emphasis through weight or size only.
- **Don't** use glassmorphism: no blurs, no frosted surfaces, no `backdrop-filter`.
- **Don't** add shadows to surfaces at rest. The launch hover glow is the only allowed shadow; it exists to signal "this is the primary action."
- **Don't** animate layout properties (height, width, top, left, padding). Transitions apply to color, background, opacity, and box-shadow only.
- **Don't** introduce a fifth state color. The Four-Color Doctrine is structural; map new states to the existing four or revise the doctrine explicitly.
- **Don't** use Ice Channel for decorative fills, background washes, or hover highlights on non-interactive elements. Its rarity is its meaning.
