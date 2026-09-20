# SurplusLink Design System (DESIGN.md)
*Inspired by Google Cloud Console, Google Workspace, Google Drive, Google Analytics, and Material 3 / shadcn design patterns.*

---

## 1. Project Overview & Philosophy

**SurplusLink** is a mission-critical community food rescue and redistribution portal connecting commercial food donors with soup kitchens and hunger-relief centers.

### Design Principles:
1. **Purpose-Built Utility (Google Cloud & Workspace)**: High information density with zero clutter. Operations (auditing batches, routing drivers, OTP verification) must be executable with minimum clicks.
2. **Dynamic Visual Hierarchy (Google Analytics)**: Differentiate critical action items (expiring food, awaiting OTP pickup) from ambient telemetry (CO₂ saved, meals enabled).
3. **Tactile Trust & Verification (Google Security & Keep)**: Micro-interactions, crisp status pills, cryptographic OTP capsules, and progress tracks reassure users of food safety and anti-fraud custody handoffs.

---

## 2. Color System & Tokens

### 2.1 Core Palette (Dark Mode First, Light Mode Compatible)

```css
:root {
  /* Canvas & Surfaces */
  --bg-canvas: #0B0F17;              /* Deep obsidian base */
  --bg-surface: #111827;             /* Primary card surface */
  --bg-surface-elevated: #1F2937;    /* Elevated hover / popover surface */
  --bg-surface-subtle: #182234;      /* Recessed container / input ground */
  --bg-surface-glass: rgba(17, 24, 39, 0.82);

  /* Brand / Primary (Google Emerald / Sustainable Green) */
  --primary-50: #ECFDF5;
  --primary-100: #D1FAE5;
  --primary-400: #34D399;
  --primary-500: #10B981;            /* Primary action green */
  --primary-600: #059669;
  --primary-glow: rgba(16, 185, 129, 0.28);

  /* Accent Accents (Google Cloud Cyan & Amber) */
  --accent-cyan: #38BDF8;            /* Logistics, proximity, transit */
  --accent-cyan-glow: rgba(56, 189, 248, 0.25);
  --accent-amber: #F59E0B;           /* Warning, pending review, expiring */
  --accent-amber-glow: rgba(245, 158, 11, 0.25);
  --accent-rose: #EF4444;            /* Critical expiry, rejection, suspended */
  --accent-purple: #A855F7;          /* Environmental impact, carbon savings */

  /* Text & Contrast */
  --text-primary: #F9FAFB;           /* 98% brightness contrast */
  --text-secondary: #94A3B8;         /* High readability subtext */
  --text-tertiary: #64748B;          /* Microcopy, captions */
  --text-inverse: #0F172A;

  /* Borders & Dividers */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-default: rgba(255, 255, 255, 0.14);
  --border-strong: rgba(255, 255, 255, 0.22);
  --border-focus: #10B981;
}

/* Light Theme Overrides */
body.light-theme {
  --bg-canvas: #F8FAFC;
  --bg-surface: #FFFFFF;
  --bg-surface-elevated: #F1F5F9;
  --bg-surface-subtle: #F8FAFC;
  --bg-surface-glass: rgba(255, 255, 255, 0.90);

  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-tertiary: #64748B;

  --border-subtle: #E2E8F0;
  --border-default: #CBD5E1;
  --border-strong: #94A3B8;
}
```

---

## 3. Typography Scale (Google Fonts & Material 3 Inspired)

Primary Display: `'Outfit', -apple-system, sans-serif`  
Primary Body & Data: `'Plus Jakarta Sans', -apple-system, sans-serif`  
Telemetry & Code: `'JetBrains Mono', monospace`

| Role | Font Family | Size | Weight | Line Height | Tracking |
|---|---|---|---|---|---|
| **Display Title** | Outfit | 1.85rem (29.6px) | 800 | 1.15 | -0.025em |
| **Section Heading (H1)** | Outfit | 1.35rem (21.6px) | 800 | 1.25 | -0.02em |
| **Card Title (H2)** | Outfit | 1.05rem (16.8px) | 700 | 1.30 | -0.01em |
| **Subheading (H3)** | Plus Jakarta Sans | 0.92rem (14.7px) | 700 | 1.40 | 0 |
| **Body (Base)** | Plus Jakarta Sans | 0.875rem (14px) | 500 | 1.50 | 0 |
| **Body (Small)** | Plus Jakarta Sans | 0.8125rem (13px) | 500 | 1.45 | +0.01em |
| **Microcopy / Caption** | Plus Jakarta Sans | 0.72rem (11.5px) | 700 | 1.35 | +0.03em (Uppercase) |
| **Numeric Telemetry** | Outfit | 1.65rem (26.4px) | 800 | 1.10 | -0.02em |

---

## 4. Spacing Scale

Based on a strict 4px grid (`4, 8, 12, 16, 20, 24, 32, 48, 64`):
- `0.25rem` (4px): Inline badges, icon gaps, micro tags.
- `0.5rem` (8px): Button padding, card info row gaps.
- `0.75rem` (12px): Standard form gap, card header-to-body margin.
- `1.0rem` (16px): Card internal padding, stats gap.
- `1.5rem` (24px): Section separations, modal padding.
- `2.0rem` (32px): Dashboard zone gaps, hero command strip margin.
- `3.0rem` (48px): Page footer separation.

---

## 5. Radius & Depth System

```css
:root {
  --radius-xs: 6px;       /* Tags, chips, micro buttons */
  --radius-sm: 8px;       /* Form inputs, segmented buttons */
  --radius-md: 12px;      /* Listing cards, stat cards */
  --radius-lg: 16px;      /* Hero command strip, telemetry ribbon, modal */
  --radius-full: 9999px;  /* Pills, avatar circles, status dots */

  /* Shadows with Ambient Top Lighting */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.15);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.20), 0 4px 12px rgba(0, 0, 0, 0.15);
  --shadow-md: 0 4px 16px -2px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.06);
  --shadow-lg: 0 12px 32px -4px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.08);
}
```

---

## 6. Component Rules (Google Workspace & Cloud Aligned)

### 6.1 Navbar & AppShell
- **Pattern**: Google Workspace persistent top chrome + Google Cloud contextual role banner.
- **Rules**: Sticky header (height: 62px) with `backdrop-filter: blur(20px)`.
- **Navigation Links**: Horizontal pills with icons. Active item features an illuminated emerald underline indicator with soft ambient glow.

### 6.2 Command Strip (Hero Summary Workspace)
- **Pattern**: Google Cloud Console project summary bar.
- **Rules**: Replaces flat title rows with an integrated command strip showing:
  - Role verification pill (`● Verified Relief Kitchen`).
  - Contextual radius or trust metric (`📍 15 km Radius Proximity`).
  - Direct Action CTA button (`Post Surplus Batch` or `Open Radar Map`).

### 6.3 Impact Telemetry Ribbon
- **Pattern**: Google Analytics audience telemetry ribbon.
- **Rules**: Unified horizontal strip with subtle vertical dividers (`.telemetry-metric`) rather than disjointed square cards. Includes icon box, uppercase micro-label, and bold numeric counter.

### 6.4 Rich Food Batch Cards (`.ingredient-card`)
- **Pattern**: Google Keep card visual art + Google Drive metadata cards.
- **Rules**:
  - Top category gradient art strip (5px height).
  - Prominent **Hero Quantity Capsule** (`25` with `KG` badge).
  - Live **Freshness Horizon Bar** (green > amber > red decay bar).
  - Storage temperature pill (`❄️ Cold Storage` / `🌡️ Ambient`).
  - Proximity badge (`📍 2.4 km`).

### 6.5 Attention Handover Station
- **Pattern**: Google Cloud Security command center alerts.
- **Rules**: High-contrast ambient container with cyan/emerald border highlight. Live badge showing pending driver collections and instant OTP input terminal.

### 6.6 Segmented Controls & Tabs
- **Pattern**: Google Material 3 segmented control.
- **Rules**: Unified recessed track (`var(--bg-surface-subtle)`) with pill buttons, count badges (`.segmented-count`), and ARIA role tab semantics.

### 6.7 Interactive Radar Map (`RoutingMap.jsx`)
- **Pattern**: Google Maps split-screen drawer + Google Earth radar HUD.
- **Rules**: Left 380px food listing drawer synchronized bidirectionally with map canvas. Map markers use custom pulsing radar rings (`.radar-marker-kitchen` & `.radar-marker-food`). Floating glass HUD displays calculated Haversine route and travel time.

---

## 7. Motion & Micro-Interactions

- **Timing Curve**: `cubic-bezier(0.16, 1, 0.3, 1)` (spring physics ease-out).
- **Button Press**: `transform: scale(0.97)` instant compression on `:active`.
- **Card Hover**: `-3px` elevation lift with subtle 1px border glow matching category accent.
- **Accessibility**: All animations automatically disabled under `@media (prefers-reduced-motion: reduce)`.
