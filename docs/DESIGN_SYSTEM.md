# UI Design System

Snack Overflow uses a tactile, minimalist light-first aesthetic inspired by modern enterprise AI interfaces: warm light-gray canvases, soft-3D beveled cards, high-contrast obsidian spotlight blocks, floating glassmorphic pill navigation, and energetic coral-red accents.

## Color Palette

| Token | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--pantry-bg` | `#EDECEC` | `#09090B` | Main page canvas |
| `--pantry-surface` | `#F4F4F5` | `#18181B` | Tactile card containers |
| `--pantry-elevated` | `#FFFFFF` | `#27272A` | Inputs, table headers, inner wells |
| `--pantry-border` | `#D4D4D8` | `#3F3F46` | Crisp hairlines and borders |
| `--pantry-text` | `#09090B` | `#FAFAFA` | Primary ink |
| `--pantry-muted` | `#71717A` | `#A1A1AA` | Secondary captions & labels |
| `--brand` (`coral`) | `#FD3A25` | `#FD3A25` | Accent dots, active underlines, CTAs, highlights |
| Obsidian Spotlight | `#09090B` | `#09090B` | Snack of the Week spotlight & toast banners |

## Typography

- **Primary Sans:** `Urbanist` (weights 400, 500, 600, 700, 800) with tight display tracking (`-0.03em`) and subtle vertical gradient fills on page headings.
- **Monospace:** `Share Tech Mono` for stock counts, vote tallies, pagination indices, and audit timestamps.

## Key Component Patterns

- **Floating Glassmorphic Navbar (`.ordan-glass-nav`):** Centered full-pill header with `backdrop-filter: blur(44px)`, `#FD3A25` active link underlines, live SSE status dot, basket counter, theme switcher, and dark pill sign-out trigger.
- **Tactile Soft-3D Cards (`.ordan-card`):** `rounded-4xl` (`32px`) surfaces with subtle top white inner highlights and bottom beveled shadows.
- **Obsidian Spotlight Cards (`.ordan-card-dark`):** Deep `#09090B` surface with radial top sheen and glowing coral-red trophy badges for the *Snack of the Week*.
- **Pill Controls:** Primary obsidian pills (`.ordan-btn-dark`), secondary tactile light pills (`.ordan-btn-light`), and fiery coral gradient CTAs (`.ordan-btn-brand`).
- **Status Visibility:** `RUNNING_LOW` (amber) and `GONE` (coral) states are visually highlighted on both catalog cards and admin tables so depleted items stand out immediately.
