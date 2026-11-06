---
name: Only Us Design System
colors:
  surface: '#fdf8ff'
  surface-dim: '#ddd8e4'
  surface-bright: '#fdf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f1fe'
  surface-container: '#f1ecf8'
  surface-container-high: '#ebe6f2'
  surface-container-highest: '#e5e0ec'
  on-surface: '#1c1a23'
  on-surface-variant: '#48454e'
  inverse-surface: '#312f38'
  inverse-on-surface: '#f4effb'
  outline: '#79757f'
  outline-variant: '#cac4cf'
  surface-tint: '#63578a'
  primary: '#605487'
  on-primary: '#ffffff'
  primary-container: '#796da1'
  on-primary-container: '#fffbff'
  inverse-primary: '#cdbef8'
  secondary: '#7c5265'
  on-secondary: '#ffffff'
  secondary-container: '#ffc8df'
  on-secondary-container: '#7b5164'
  tertiary: '#735724'
  on-tertiary: '#ffffff'
  tertiary-container: '#8e703a'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e8deff'
  primary-fixed-dim: '#cdbef8'
  on-primary-fixed: '#1f1342'
  on-primary-fixed-variant: '#4b3f70'
  secondary-fixed: '#ffd8e7'
  secondary-fixed-dim: '#edb8ce'
  on-secondary-fixed: '#301021'
  on-secondary-fixed-variant: '#623b4d'
  tertiary-fixed: '#ffdea9'
  tertiary-fixed-dim: '#e6c183'
  on-tertiary-fixed: '#271900'
  on-tertiary-fixed-variant: '#5c4210'
  background: '#fdf8ff'
  on-background: '#1c1a23'
  surface-variant: '#e5e0ec'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

### Brand Personality & Emotional Architecture
This design system is tailored for long-distance couples seeking an intimate, calm, and deeply reassuring sanctuary. The emotional core balances *nostalgic warmth* with *poetic reliability*. It purposefully rejects gaudy romance tropes, intense neon pinks, and transactional gamification. Instead, the interface acts as a shared digital living room under twilight: soft, gentle, tactile, and quiet.

### Visual Style: Cream Moonlight & Lyrical Tactility
The visual ethos blends **Soft Skeuomorphism & Warm Editorial Minimalism**:
- **Cream & Moonlight Palette:** A base of whipped warm milk tea and soft moonlight purples that soothes screen fatigue during late-night mutual interactions.
- **Micro-Textures & Subtlety:** Non-intrusive organic curves, paper-like pill containers, and soft ambient glows simulating candlelight or moonbeams.
- **Poetic Space:** Expansive breathing space (`space-lg`, `space-xl`) that lets emotional texts, photos, and countdown dates resonate without cognitive clutter.

## Colors

The palette establishes an emotional balance between twilight contemplation and comforting daylight warmth.

### Palette Architecture
- **Primary (`#9184BA` - Moonlight Violet):** The anchoring brand tone. Evokes twilight skies, quiet nighttime video calls, and serene emotional connection. Used for primary interactive triggers, active tab states, and key highlights.
- **Secondary (`#EAB5CB` - Sakura Dawn):** A warm, restrained petal pink. Used for co-presence indicators, heartbeats, audio memo notes, and celebratory emotional stamps.
- **Tertiary (`#F2CC8D` - Warm Lantern Gold):** Reminiscent of a glowing nightstand lamp. Used for milestone countdowns, anniversary flags, and special memory stars.
- **Deep Slate Neutral (`#34323B` - Midnight Charcoal):** Softened dark ink for high-readability typography, replacing harsh `#000000` to prevent eye strain.
- **Canvas Base (`#FFF8F3` - Milk Tea Cream):** The warm, non-glare surface foundation of the entire WeChat Mini Program.
- **Sub-Surface (`#F7EFE9` - Cashmere Sand):** Used for inset cards, text field wells, and nested containers.
- **Midnight Navy Accent (`#303752` - Deep Night Sky):** Used sparingly for high-contrast night-mode widgets, letter seals, and focused editorial headlines.

### Functional States & Contrast
- Secondary text uses `#34323B` at 65% opacity (`#34323B` with alpha or `#777382`).
- Borders and dividers rely on low-opacity strokes (`rgba(145, 132, 186, 0.12)`) over `#FFF8F3`.

## Typography

The type system prioritizes legibility, warm human geometry, and emotional resonance within mobile-constrained WeChat webview bounds. 

### Font Selection & Pairing
- **Primary Typeface:** `Plus Jakarta Sans`, supplemented by system CJK fallbacks (`PingFang SC`, `Hiragino Sans GB`, `Microsoft YaHei`). The rounded terminals and humanistic proportions of Plus Jakarta Sans integrate naturally with smooth Chinese typography.
- **Editorial Emphasis:** Large milestone counters and countdown days leverage `display-lg` with loose letter spacing and warm tabular numerical figures.

### Vertical Rhythm
Body copy line heights remain intentionally generous (`1.6x` to `1.7x`) to emulate handwritten letters and high-end print journals, reducing visual fatigue during long letter reading.

## Layout & Spacing

### Mobile-First Fluid Grid (WeChat Mini Program)
The layout is optimized for portrait mobile viewports (375px–430px base width):
- **Outer Canvas Margins:** Strict `16px` (`margin`) outer screen margin ensuring content never feels cramped against device curved bezels.
- **Card Padding Hierarchy:** Primary cards use `20px` internal padding, creating an unhurried, breathable frame. Secondary modular chips use `12px` padding.
- **Top Safe Area:** Accounting for the native WeChat capsule button (WeChat menu/close button, ~88px header height), custom navigation headers maintain vertical alignment with the capsule's visual center.
- **Bottom Safe Area:** A fixed 5-tab bar with an extra bottom padding offset (`env(safe-area-inset-bottom)`) prevents collision with the iOS home indicator.

## Elevation & Depth

Visual depth is achieved through **ambient twilight glows** and **layered surface tonalities**, rather than hard drop shadows.

### Elevation Hierarchy
1. **Canvas Level (0dp):** Base background `#FFF8F3`. Un-elevated.
2. **Resting Card (Level 1):** Background `#FFFFFF` or `#F7EFE9`. Shadow: `0 4px 20px -2px rgba(145, 132, 186, 0.08)`. Conveys a soft lift like thick archival paper sitting on linen.
3. **Floating Controls & Active Modals (Level 2):** Background `#FFFFFF` with border `1px solid rgba(234, 181, 203, 0.25)`. Shadow: `0 10px 28px -4px rgba(48, 55, 82, 0.10)`.
4. **Bottom Dock Bar:** Glassmorphism surface with `backdrop-filter: blur(20px)`, background: `rgba(255, 248, 243, 0.88)`, top border `1px solid rgba(145, 132, 186, 0.12)`.

## Shapes

The shape system employs pronounced, reassuring curvatures (16px to 24px) reflecting warmth, gentleness, and safety.

### Geometric Rules
- **Micro UI & Badges:** `8px` (`rounded-sm`).
- **Input Fields & Small Cards:** `16px` (`rounded-md`).
- **Feature Cards & Content Sheets:** `20px`–`24px` (`rounded-lg` / `rounded-xl`).
- **Interactive Action Buttons & Avatars:** Fully rounded pill shapes (`9999px`) to maintain tactile delight.

## Components

### 1. Navigation Bar (Five Persistent Modules)
- **Structure:** Fixed bottom navigation container with 5 tabs:
  1. **小屋 (Cabin):** Shared virtual home, mood weather, status widgets.
  2. **瞬间 (Moments):** Micro-journal, dual photo timelines, daily snapshots.
  3. **信箱 (Postbox):** Slow letters, voice notes, unopened future capsules.
  4. **见面 (Reunion):** Next flight/train countdown, meet-up itineraries, distance tracker.
  5. **我们 (Us):** Anniversaries, wishlists, shared memory vault, space settings.
- **Styling:** Frosted bottom bar (`rgba(255, 248, 243, 0.90)` + `blur(18px)`).
- **Tab State:** Active tab shows Moonlight Violet icon (`#9184BA`) with a micro Sakura Dawn dot indicator (`#EAB5CB`). Inactive tabs use muted neutral (`rgba(52, 50, 59, 0.45)`).

### 2. Buttons
- **Primary Pill:** Background `#9184BA`, text `#FFFFFF`, height `48px`, font `label-lg`. Tap state triggers a subtle soft scaling (`transform: scale(0.98)`).
- **Secondary Milk Pill:** Background `#F7EFE9`, text `#34323B`, border `1px solid rgba(145, 132, 186, 0.15)`.
- **Soft Romantic Trigger:** Background `linear-gradient(135deg, #EAB5CB 0%, #9184BA 100%)`, text `#FFFFFF`, delicate shadow `0 6px 16px rgba(234, 181, 203, 0.35)`.

### 3. Cards & Memory Modules
- **Dual Status Card:** Inset into the Cabin screen. Shows both partners' local time, battery, weather, and real-time mood emoji on `#FFFFFF` with a `20px` border radius and `1px` soft border (`rgba(145, 132, 186, 0.1)`).
- **Reunion Countdown Card:** Deep sky navy (`#303752`) background with warm gold text (`#F2CC8D`) for the remaining day count, resembling stars in the night sky.

### 4. Input Fields & Letter Editors
- **Text Wells:** Background `#F7EFE9`, border radius `16px`, zero harsh borders. Focus state transitions to a glowing outline `1.5px solid rgba(145, 132, 186, 0.45)`.
- **Letter Writing View:** Lined textured backdrop mimicking stationery, with generous `26px` line-heights.

### 5. Selection Controls & Chips
- **Chips:** Pill-shaped tags (`height: 32px`, `padding: 0 16px`), background `rgba(145, 132, 186, 0.08)`, active state background `#9184BA`, active text `#FFFFFF`.
- **Checkboxes & Heart Toggles:** Custom heart or smooth circle toggles filling with `#EAB5CB` when activated.