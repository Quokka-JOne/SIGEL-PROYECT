---
name: Modern Retail & Stationery
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#444651'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#694bb2'
  on-secondary: '#ffffff'
  secondary-container: '#b091fe'
  on-secondary-container: '#43218a'
  tertiary: '#002664'
  on-tertiary: '#ffffff'
  tertiary-container: '#003a91'
  on-tertiary-container: '#88a9ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#513199'
  tertiary-fixed: '#dae2ff'
  tertiary-fixed-dim: '#b1c5ff'
  on-tertiary-fixed: '#001847'
  on-tertiary-fixed-variant: '#00409f'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
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
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
  numeric-pos:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 28px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is tailored for high-velocity, offline-first commerce in community bookstores and stationery hubs (*librerías y papelerías*). It blends reliable enterprise management with the vibrant, tactile charm of creative papercraft, notebooks, pens, and learning supplies.

### Brand Personality & Emotional Core
- **Reliable & Indestructible:** Gives shopkeepers utter peace of mind during spotty connectivity with instant offline-first responsiveness and clear sync indicators.
- **Approachable & Creative:** Balancing authoritative deep blues with spirited lavender, sky blue, and energetic accents to create an inspiring, friendly workspace for retail staff and owners.
- **Ergonomic Precision:** Rapid, thumb-friendly touch interactions built for busy checkout counters, inventory scanning, and AI-assisted restocking predictions.

### Design Movement: Modern Frosted Neumorphism & Crisp Tactility
The style combines:
1. **Clean Neo-SaaS Surface Hierarchy:** Crisp `#FFFFFF` card layers elevated above a calm, cool-tinted `#F8FAFC` foundation with razor-thin structural borders (`#E2E8F0`).
2. **Frosted Translucency (Glassmorphism):** Floating navigation capsules, AI interaction sheets, and sticky POS summaries utilize optical backdrop blur with soft lighting rims.
3. **Smooth Curvature:** Gentle, generous radii (`rounded-2xl` for containers and pill buttons) convey warmth, modern accessibility, and thumb-friendly ease.

## Colors

The palette directly maps operational, organizational, and creative facets of retail stationery commerce:

### Core Hues & Roles
- **Primary Azul Principal (`#1E3A8A` & Deep Base `#172554`):** Anchors the platform’s core architecture—navigation headers, primary CTA buttons, financial totals, and high-level metrics. Communicates trust, stability, and fiscal rigor.
- **Secondary Lavanda (`#A788F4`):** The signature accent for creative inventory, AI intelligence prompts, assistant chats, and active navigation highlights.
- **Tertiary Celeste / Sky Blue (`#5F8FFF`):** Used for sync telemetry (online/offline transitions, cloud sync pills), auxiliary informational badges, line graphs, and secondary POS actions.
- **Alert Coral (`#FF6B6B`):** Urgent visual signifier reserved for low stock thresholds, out-of-stock items, sync collision errors, payment voids, and destructive actions.
- **Highlight Amarillo (`#FDD835`):** High-visibility tags, starred catalog items, bestsellers, pending synchronizations, and featured educational kits.
- **Base Surfaces & Outlines:** Foundation background at `#F8FAFC`, card elevations at `#FFFFFF`, with borders stabilized at `#E2E8F0`. Slate neutrals (`#0F172A` down to `#94A3B8`) provide crisp legibility for multi-tiered catalog listings.

### Semantic Tonal Application
- **Active Navigation Pill:** Tinted lavender wash (`rgba(167, 136, 244, 0.22)`) paired with `#172554` typography and `#A788F4` icon accents.
- **Offline Mode Indicator:** Subtle amber-coral micro-pill warning without blocking cashier throughput; turns vibrant Sky Blue (`#5F8FFF`) when back online and flushing local IndexedDB queues.

## Typography

The type system blends the energetic curves of **Plus Jakarta Sans** for headlines and interactive cards with the tabular precision of **Inter** for dense pricing tables, barcode scanning values, and inventory status chips.

### Functional Roles
- **Headlines (Plus Jakarta Sans):** Expressive, geometric, and modern. Conveys clarity across dashboard titles, cash register receipts, and cashier prompts.
- **Body Text (Plus Jakarta Sans):** Comfortable readability at standard mobile viewports, avoiding eye fatigue during extended POS inventory intake shifts.
- **Data & Micro-copy (Inter):** Highly legible numeric figures for Córdoba (NIO) / USD currency values, SKU codes, and condensed badges on small mobile screens.
- **Numeric-POS (Inter 700):** Dedicated tabular styling to ensure rapid glance-checks of shopping cart totals and cash drawer reconciliation.

## Layout & Spacing

The layout is built around an offline-capable, responsive 4-column (mobile), 8-column (tablet/POS counter terminal), and 12-column (desktop back-office) fluid grid.

### Layout Mechanics
- **Base Rhythm:** Strict 4px/8px modular spacing matrix ensuring predictable alignment between handheld mobile barcode scanning and widescreen desktop stock orders.
- **Floating Island Padding:** A continuous bottom margin clearance of `5.5rem` (88px) is enforced across all mobile screens to prevent content collision with the floating frosted pill navigation bar.
- **Multi-Form Adaptations:**
  - *Mobile (<640px):* Single-column POS product feeds, full-width quick action drawers, floating navigation pill anchored 12px from the bottom edge.
  - *Tablet / Counter Terminal (640px - 1024px):* Split-view layout with live cart/receipt persistent on the right (380px) and catalog drill-down grid on the left.
  - *Desktop (>1024px):* Comprehensive dashboard view with collapsible sidebar navigation, wide data grids, and batch barcode import panels.

## Elevation & Depth

This design system uses ambient, low-contrast shadows and frosted glass translucency instead of harsh, heavy dropshadows, ensuring battery efficiency and visual cleanliness on mobile and PWA displays.

### Layer Hierarchy
1. **Base Floor (Level 0):** `#F8FAFC` flat canvas for primary views and scrollable dashboards.
2. **Elevated Surfaces (Level 1):** `#FFFFFF` content cards and inventory rows with a delicate boundary ring (`1px solid #E2E8F0`) and an ambient, light-diffused shadow (`0px 2px 8px -2px rgba(15, 23, 42, 0.05)`).
3. **Interactive & Hover Cards (Level 2):** Focused POS cards, category tiles, and role cards lift slightly with `0px 8px 20px -4px rgba(30, 58, 138, 0.08)`.
4. **Floating Frosted Pills & Modals (Level 3):**
   - The primary navigation bar and top notification banners use `backdrop-filter: blur(16px)` with `background: rgba(255, 255, 255, 0.88)`, bounded by a translucent hairline border (`1px solid rgba(226, 232, 240, 0.8)`) and an elevated float shadow (`0px 12px 32px -4px rgba(23, 37, 84, 0.12)`).

## Shapes

The interface embraces a friendly yet orderly geometry. Card corners, contextual buttons, inputs, and indicators use soft, approachable radiuses that evoke the corners of notebooks, stationery sets, and rounded rubber stamps.

- **Primary Cards & Containers:** Standardized at `rounded-2xl` (16px / 1rem) for an ergonomic, contemporary handheld tactile feel.
- **Pills & Interactive Badges:** Standardized at `rounded-full` (9999px) for tab selectors, live status pills, cashier role switches, and floating navigation components.
- **Inputs & Tables:** Subtly rounded at `rounded-xl` (12px / 0.75rem) to ensure clean structural boundaries while maximizing data density.

## Components

### 1. Floating Pill Navigation Bar
- **Structure:** Centered horizontal pill floating 12px above the screen bottom, spanning up to 92% viewport width on mobile or 680px on desktop.
- **Materiality:** Translucent pure white (`rgba(255, 255, 255, 0.92)`) with `backdrop-filter: blur(16px)` and perimeter stroke `#E2E8F0`.
- **Active State Capsule:** The active tab adopts a pill background in soft lavender (`rgba(167, 136, 244, 0.22)`) with `#172554` text and an active purple icon (`#A788F4`).
- **Telemetry Dot:** Embedded notification pips (e.g., sync status or notifications) appear on the top right of tabs in `#FDD835` (pending) or `#FF6B6B` (alerts).

### 2. Buttons & Action Elements
- **Primary Action (Venta / Cobro):** Solid `#1E3A8A` background with crisp white text, `rounded-xl`, subtle active scale down (`scale: 0.98`), and high touch targets (minimum 44px height).
- **AI Restock & Smart Suggestions:** Gradient pill or solid background in `#A788F4` with white text and a sparkle micro-icon.
- **Secondary / Utility Actions:** Crisp `#FFFFFF` background with 1px `#E2E8F0` border and `#172554` label; turns to soft `#F1F5F9` on press.
- **Destructive / Void Actions:** Soft coral tint (`rgba(255, 107, 107, 0.12)`) with `#FF6B6B` bold typography.

### 3. Inventory & Status Chips
- **Low Stock Pill:** `#FF6B6B` tint background (`rgba(255, 107, 107, 0.15)`) with `#D32F2F` text and a pulsing warning dot.
- **Optimal Stock Pill:** Soft emerald tint (`rgba(16, 185, 129, 0.12)`) with `#047857` text.
- **Sync Status Badge:** Pill shape featuring Sky Blue (`#5F8FFF`) with an animated circular sync arrow indicating background IndexedDB persistence.
- **Category Tags (Papelería, Libros, Arte):** Neutral light slate `#F1F5F9` with `#475569` text, `rounded-full`, and compact 11px Inter labels.

### 4. POS Quick Transaction Cards
- **Product Tiles:** `rounded-2xl` white cards displaying thumbnail, bold unit price in NIO/USD, item title, and a quick-tap `+` increment pill button in the top corner.
- **Zero-Latency Response:** Immediate local visual update before committing to background IndexedDB and sync queues.

### 5. Input Fields & Search Bars
- **Barcode & SKU Search:** Large 48px height field with a subtle `#E2E8F0` border, `rounded-xl`, camera-barcode icon prefix in `#5F8FFF`, and high-contrast `#0F172A` value inputs.
- **Focus State:** 2px ring in primary Azul (`#1E3A8A`) with zero screen jitter.

### 6. AI Chat & Smart Assistant Card
- **Appearance:** Tinted border with a gentle linear gradient between `#A788F4` and `#5F8FFF`.
- **Content:** Suggested inventory replenishment amounts, season predictions (e.g., *Temporada Escolar*), and natural-language sales summaries.

### 7. Role & Branch Switcher
- Compact floating capsule on the top header allowing instant toggle between cashier, supervisor, and multi-branch inventory views with active status icons.