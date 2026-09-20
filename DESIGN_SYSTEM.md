# SurplusLink — Visual System Specification (`DESIGN_SYSTEM.md`)

*Unified design language for SurplusLink community food rescue logistics.*

---

## 1. Typography

| Role | Font Family | Size | Weight | Line Height | Tracking | Purpose |
|---|---|---|---|---|---|---|
| **Display / Hero** | `'Outfit', sans-serif` | `1.85rem` (29.6px) | 800 | 1.15 | -0.025em | Main dashboard titles |
| **Section H1** | `'Outfit', sans-serif` | `1.35rem` (21.6px) | 800 | 1.25 | -0.020em | Station & zone titles |
| **Card H2** | `'Outfit', sans-serif` | `1.05rem` (16.8px) | 700 | 1.30 | -0.010em | Listing item names |
| **Subheading H3** | `'Plus Jakarta Sans', sans-serif` | `0.92rem` (14.7px) | 700 | 1.40 | 0.000em | Group headers, tabs |
| **Body (Base)** | `'Plus Jakarta Sans', sans-serif` | `0.875rem` (14.0px) | 500 | 1.50 | 0.000em | Descriptive paragraphs, notes |
| **Body (Small)** | `'Plus Jakarta Sans', sans-serif` | `0.8125rem` (13.0px) | 500 | 1.45 | +0.010em | Card details, subtext |
| **Microcopy / Tag** | `'Plus Jakarta Sans', sans-serif` | `0.72rem` (11.5px) | 700 | 1.35 | +0.030em | Category tags, uppercase labels |
| **Numeric Telemetry** | `'JetBrains Mono', monospace` | `1.35rem` (21.6px) | 800 | 1.00 | -0.010em | OTP tokens, quantities, km |

---

## 2. Color Tokens (Restrained, Semantic Palette)

```css
:root {
  /* Neutral Canvas & Surfaces */
  --bg-canvas: #0B0F17;              /* Deep obsidian base */
  --bg-surface: #111827;             /* Primary card surface */
  --bg-surface-elevated: #1F2937;    /* Elevated modal/dropdown ground */
  --bg-surface-subtle: #182234;      /* Recessed input / segmented control */
  --bg-surface-hover: #1E293B;       /* Interactive cursor hover */
  --bg-surface-glass: rgba(17, 24, 39, 0.82);

  /* Functional Status Colors (Meaning-First) */
  --primary-500: #10B981;            /* Verified, available, fulfilled */
  --primary-400: #34D399;
  --primary-glow: rgba(16, 185, 129, 0.28);

  --accent-cyan: #38BDF8;            /* Logistics, proximity, transit radar */
  --accent-amber: #F59E0B;           /* Expiring soon (<48h), pending review */
  --accent-rose: #EF4444;            /* Critical expiry (<24h), rejected, dispute */
  --accent-purple: #A855F7;          /* Carbon CO₂ savings, meals enabled */

  /* Text Contrast Hierarchy */
  --text-primary: #F9FAFB;           /* Primary reading, 98% brightness */
  --text-secondary: #94A3B8;         /* Auxiliary explanations */
  --text-tertiary: #64748B;          /* Captions, hairline timestamps */

  /* Structural Dividers */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-default: rgba(255, 255, 255, 0.14);
  --border-strong: rgba(255, 255, 255, 0.22);
  --border-focus: #10B981;
}

/* Light Theme Mode */
body.light-theme {
  --bg-canvas: #F8FAFC;
  --bg-surface: #FFFFFF;
  --bg-surface-elevated: #F1F5F9;
  --bg-surface-subtle: #F8FAFC;
  --bg-surface-hover: #F1F5F9;
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

## 3. Surface Hierarchy

```
Page Canvas (Deep obsidian --bg-canvas with 24px micro-dot grid)
  └── Surface Level 1 (--bg-surface + 1px subtle border + 1px top-edge light highlight)
        └── Elevated Surface Level 2 (Modals, Flight Cockpit HUD, Tooltips with backdrop blur)
              └── Interactive Surface Level 3 (Hover lift -3px + category-colored edge glow)
                    └── Selected / Active State (Cyan/emerald left accent marker bar)
```

---

## 4. Spacing Scale (4px Strict Grid)

| Token | Pixels | Application |
|---|---|---|
| `space-1` | 4px | Tag padding, icon-to-label inline gaps |
| `space-2` | 8px | Button vertical padding, card sub-row gaps |
| `space-3` | 12px | Form field vertical gaps, metadata padding |
| `space-4` | 16px | Card body internal padding, stat box spacing |
| `space-6` | 24px | Section margins, modal internal padding |
| `space-8` | 32px | Dashboard zone separations, command hero strip margin |
| `space-12`| 48px | Major layout footer gaps |

---

## 5. Border Radius & Shadows

```css
:root {
  --radius-xs: 6px;       /* Badges, micro tags, chips */
  --radius-sm: 8px;       /* Form controls, segmented control buttons */
  --radius-md: 12px;      /* Food cards, custody panels */
  --radius-lg: 16px;      /* Command Strip hero, Telemetry Ribbon, Modals */
  --radius-full: 9999px;  /* Pills, status indicator dots, user badge */

  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.15);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.20), 0 4px 12px rgba(0, 0, 0, 0.15);
  --shadow-md: 0 4px 16px -2px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.06);
  --shadow-lg: 0 12px 32px -4px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.08);
}
```

---

## 6. Motion & Micro-Interactions

- **Micro (press, hover, toggle)**: `80ms – 120ms` with `ease-out`. Button active state scales down (`scale(0.97)`).
- **Component (drawer slide, modal open, accordion)**: `180ms – 220ms` with `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Page Transitions**: `250ms – 300ms` staggered spring entrance.
- **Accessibility**: Wrapped in `@media (prefers-reduced-motion: reduce)`.
