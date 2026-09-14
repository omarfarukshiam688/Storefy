# Storefy — Design System

## 1. Design Philosophy

Storefy is a modern, premium, multi-tenant SaaS platform for small businesses.

Visual direction:
- modern
- premium
- clean
- professional
- trustworthy
- production-grade
- SaaS-oriented
- excellent usability
- restrained visual complexity

Avoid:
- generic AI-generated dashboard appearance
- excessive gradients
- excessive glassmorphism
- unnecessary animations
- random colors
- inconsistent border radius
- oversized typography
- excessive shadows
- decorative UI without functional purpose
- emoji as UI icons
- inconsistent icon styles
- visually noisy layouts

## 2. Color System

### Semantic Tokens (CSS Variables)

Defined in `app/globals.css` using Tailwind v4 `@theme` block.

Light mode:
- `--background`: white
- `--foreground`: near-black slate
- `--card`: white
- `--card-foreground`: near-black slate
- `--popover`: white
- `--popover-foreground`: near-black slate
- `--primary`: dark slate `hsl(222.2 47.4% 11.2%)`
- `--primary-foreground`: near-white `hsl(210 40% 98%)`
- `--secondary`: light gray `hsl(210 40% 96.1%)`
- `--secondary-foreground`: dark slate
- `--muted`: light gray
- `--muted-foreground`: medium gray
- `--accent`: light gray
- `--accent-foreground`: dark slate
- `--destructive`: red `hsl(0 84.2% 60.2%)`
- `--border`: light border gray
- `--input`: light input gray
- `--ring`: near-black slate

Dark mode:
- `--background`: dark slate `hsl(222.2 84% 4.9%)`
- `--foreground`: near-white
- `--card`: dark slate
- `--card-foreground`: near-white
- `--popover`: dark slate
- `--popover-foreground`: near-white
- `--primary`: near-white
- `--primary-foreground`: dark slate
- `--secondary`: dark slate
- `--secondary-foreground`: near-white
- `--muted`: dark slate
- `--muted-foreground`: medium gray
- `--accent`: dark slate
- `--accent-foreground`: near-white
- `--destructive`: dark red
- `--border`: dark border gray
- `--input`: dark input gray
- `--ring`: light slate

### Usage Rules
- Use semantic tokens (`bg-primary`, `text-muted-foreground`, `border-border`, etc.) everywhere.
- Do not hardcode arbitrary hex/RGB colors in components.
- Use `destructive` only for error/destructive actions.
- Use `accent` for subtle hover/active backgrounds.

## 3. Typography

### Font Families
- **Primary**: DM Sans (`--font-dm-sans`) — used for UI text, headings, body.
- **Mono**: Geist Mono (`--font-geist-mono`) — used for code, technical data.
- **Sans fallback**: Geist (`--font-geist`) — available but DM Sans is the primary identity font.

### Hierarchy
- Page title / H1: `text-3xl font-bold tracking-tight`
- Section title / H2: `text-2xl font-semibold tracking-tight`
- Card title / H3: `text-lg font-semibold`
- Body: `text-base`
- Small / helper: `text-sm text-muted-foreground`
- Caption / metadata: `text-xs text-muted-foreground`

### Weights
- Bold: `font-bold` — primary headings, emphasis
- Semibold: `font-semibold` — section headings, labels, card titles
- Medium: `font-medium` — buttons, secondary text
- Regular: default — body text

### Line Heights
- Headings: default (`leading-tight` via `tracking-tight`)
- Body: default
- Buttons: default

### Responsive
- Reduce heading sizes on mobile only when necessary; the current scale works well across breakpoints.

## 4. Spacing System

Use Tailwind's default spacing scale (`p-4`, `p-6`, `p-10`, `gap-4`, `space-y-5`, etc.).

Common patterns observed:
- Page padding: `p-6` on mobile, `lg:p-10` on desktop
- Card padding: `p-6`
- Form field spacing: `space-y-5`
- Section spacing: `mb-8`, `mb-12`
- Grid gaps: `gap-4`, `gap-6`

Do not use arbitrary values like `p-[17px]` unless there is a clear design reason.

## 5. Border Radius

Defined in `app/globals.css`:
- `--radius-lg`: `0.5rem` (8px)
- `--radius-md`: `calc(var(--radius-lg) - 2px)` (6px)
- `--radius-sm`: `calc(var(--radius-lg) - 4px)` (4px)

Usage:
- Buttons: `rounded-lg`
- Inputs: `rounded-lg`
- Cards: `rounded-xl`
- Dialogs/modals: `rounded-xl`
- Icon containers: `rounded-lg` or `rounded-md`
- Avatar: `rounded-full`

Keep radius consistent. Do not introduce new radius values.

## 6. Shadows & Elevation

Current usage is restrained.

- Primary shadow: `shadow` — cards, elevated surfaces
- Hover shadow: `shadow-sm`, `shadow-md`, `shadow-lg` — interactive states
- Buttons default: `shadow-md`, hover `shadow-lg`, active `shadow-sm`

Rules:
- Apply shadows only to interactive or elevated elements.
- Do not stack multiple shadows.
- Do not use colored shadows.

## 7. Buttons

Defined in `components/ui/button.tsx` using `class-variance-authority`.

### Variants
- `default`: primary CTA, `bg-primary text-primary-foreground shadow-md hover:shadow-lg`
- `destructive`: dangerous actions, `bg-destructive`
- `outline`: secondary actions, `border border-input`
- `secondary`: tertiary actions, `bg-secondary`
- `ghost`: minimal actions, `hover:bg-accent`
- `link`: text links styled as buttons

### Sizes
- `default`: `h-10 px-4 py-2`
- `sm`: `h-9 rounded-md px-3 text-xs`
- `lg`: `h-11 rounded-lg px-8`
- `icon`: `h-10 w-10`

### States
- Disabled: `disabled:opacity-60 disabled:cursor-not-allowed`
- Loading: replace button text with `...` suffix
- Active: `active:scale-95` (subtle press feedback)
- Focus: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

### Usage Rules
- One primary CTA per screen.
- Use `default` for primary actions.
- Use `outline` or `ghost` for secondary navigation.
- Use `destructive` only for delete/remove actions.
- Use `link` for inline navigation within text.

## 8. Forms

### Inputs
Defined in `components/ui/input.tsx`.

- Height: `h-10` standard, `h-11` for prominent forms
- Padding: `px-3 py-2` standard, `px-4` for larger inputs
- Border: `border border-input`
- Background: `bg-transparent`
- Focus: `focus-visible:ring-2 focus-visible:ring-ring`
- Disabled: `disabled:cursor-not-allowed disabled:opacity-50`
- Text: `text-base` with `md:text-sm`

### Labels
Defined in `components/ui/label.tsx`.

- Style: `text-sm font-semibold leading-none`
- Always associate with input via `htmlFor` / `id`.
- Place text directly above the input.

### Validation Feedback
- Error text: `text-sm font-medium text-destructive`
- Success text: `text-xs text-green-600 font-medium` (observed in onboarding)
- Helper text: `text-sm text-muted-foreground`

### Password Fields
- Include visibility toggle using `Eye` / `EyeOff` from Lucide.
- Toggle button: `absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent`

### Selects / Textareas
- Select: `h-11 w-full rounded-lg border border-input bg-background px-4`
- Textarea: same border/radius treatment, with `focus:ring-2 focus:ring-ring`

## 9. Cards

Defined in `components/ui/card.tsx`.

- Container: `rounded-xl border bg-card text-card-foreground shadow`
- Header: `flex flex-col space-y-1.5 p-6`
- Title: `font-semibold leading-none tracking-tight`
- Description: `text-sm text-muted-foreground`
- Content: `p-6 pt-0`
- Footer: `flex items-center p-6 pt-0`

### Usage Rules
- Use cards to group related content.
- Do not add cards to every section unnecessarily.
- Card headers should be concise.

## 10. Tables

No table component exists yet.

When tables are introduced:
- Row height: comfortable touch target (~48px+)
- Header: `text-sm font-semibold text-muted-foreground`
- Hover: `hover:bg-accent`
- Border: `border-b border-border`
- Empty state: centered muted text
- Loading state: skeleton rows
- Mobile: horizontal scroll wrapper or card-based transformation

## 11. Navigation

### Sidebar
No sidebar component exists yet.

When introduced:
- Width: `w-64` collapsed, `w-16` icon-only
- Background: `bg-card` or `bg-background` with border
- Active item: `bg-accent text-accent-foreground`
- Inactive item: `text-muted-foreground hover:bg-accent`
- Icon: Lucide, `h-4 w-4`
- Collapse toggle: at bottom or top

### Top Navigation
Current pattern (dashboard header):
- Height: `h-14`
- Border: `border-b`
- Max width container: `max-w-5xl mx-auto`
- Brand left, user actions right

### Mobile Navigation
- Use bottom nav or hamburger drawer.
- Do not compress desktop nav into mobile.

## 12. Icons

Primary icon library: **Lucide React** (`lucide-react`).

Rules:
- Use Lucide consistently for all functional icons.
- Do not mix with other icon libraries without explicit need.
- Do not use emojis as UI icons.
- Standard size: `h-4 w-4` for inline, `h-5 w-5` for standalone, `h-6 w-6` for prominent.
- Color: inherit from text color, or use `text-muted-foreground` for subtle icons.

## 13. Responsive Design

Breakpoints (Tailwind defaults):
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Mobile First
- Design for mobile, enhance for larger screens.
- Auth pages: hide brand panel on mobile, show compact logo header.
- Dashboard: single column on mobile, multi-column grid on desktop.

### Tested Targets
- 1440px / 1280px / 1024px: desktop layouts
- 768px: tablet adaptations
- 430px / 390px / 375px: mobile usability

### Rules
- No horizontal overflow.
- Touch targets ≥ 44px.
- Forms remain usable at 375px width.

## 14. Animation

Use animation sparingly.

Current usage:
- Button press: `active:scale-95`
- Toast enter/exit: handled by Sonner
- Page transitions: none currently

Rules:
- Use animation only for feedback, navigation, hierarchy, or perceived responsiveness.
- Duration: `duration-200` for micro-interactions.
- Do not use decorative animations.

## 15. Accessibility

Minimum requirements:
- Semantic HTML (`<header>`, `<main>`, `<nav>`, `<button>`, `<form>`)
- Labels associated with inputs via `htmlFor` / `id`
- Focus visible: `focus-visible:ring-2 focus-visible:ring-ring`
- Disabled states clearly indicated
- Color contrast meets WCAG AA
- Keyboard navigation supported
- Touch targets ≥ 44px on mobile
- ARIA labels on icon-only buttons (`aria-label`)

## 16. Component Architecture

Pattern:
```
Design Tokens (globals.css)
    ↓
UI Primitives (components/ui/)
    ↓
Shared Components (components/auth/, components/admin/)
    ↓
Feature Components (page-specific)
    ↓
Pages (app/)
```

### Existing Primitives
- `components/ui/button.tsx`
- `components/ui/card.tsx`
- `components/ui/input.tsx`
- `components/ui/label.tsx`
- `components/ui/sonner.tsx`
- `components/ui/toast.tsx`

### Existing Shared Components
- `components/auth/auth-card.tsx`
- `components/auth/auth-panel.tsx`
- `components/auth/dashboard-header.tsx`
- `components/auth/sign-in-form.tsx`
- `components/auth/sign-up-form.tsx`
- `components/auth/forgot-password-form.tsx`
- `components/auth/reset-password-form.tsx`
- `components/auth/verify-email-form.tsx`
- `components/auth/sign-out-button.tsx`
- `components/admin/store-settings-form.tsx`

### Utility
- `lib/utils.ts` — `cn()` helper using `clsx` + `tailwind-merge`

## 17. Dark Mode

Dark mode tokens are fully defined in `app/globals.css` under `.dark`.

Current state:
- Dark mode CSS variables exist.
- `next-themes` is installed but not actively used in the current layout.

When dark mode is enabled:
- Toggle via `next-themes` `ThemeProvider`.
- Ensure all components use semantic tokens, not hardcoded colors.

## 18. Security & Performance Notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- Use `NEXT_PUBLIC_*` prefix only for client-safe values.
- Server Components by default; `"use client"` only when necessary.
- Images are currently `unoptimized: true` in `next.config.mjs`.
