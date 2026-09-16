# MUST UI DESIGN — Storefy

> **Status:** Mandatory UI/UX design system and non-negotiable implementation contract  
> **Applies to:** Every Storefy module, page, component, form, table, button, modal, sidebar, toast, empty state, loading state, and responsive breakpoint  
> **Priority:** This document governs all UI/UX decisions. Functional/backend/database behavior must remain unchanged unless a task explicitly says otherwise.

---

## 1. Product Design Direction

Storefy must feel like a **serious, premium, modern SaaS product** that a real business owner would trust with their store.

### Core aesthetic

- Apple-like
- Modern SaaS
- Premium
- Slightly luxurious
- Bold
- Professional
- Trustworthy
- Clean
- Visually rich, but restrained
- Polished rather than flashy

### Target emotional response

> **“This looks like a serious SaaS product that I can trust with my business.”**

The interface must NOT feel like:
- A student project
- A generic admin template
- A Bootstrap dashboard
- A cheap SaaS clone
- A childish UI
- An over-designed Dribbble concept
- A purple-only template

---

## 2. NON-NEGOTIABLE ENGINEERING BOUNDARY

### UI redesign only

When implementing or redesigning UI:

**DO NOT change:**
- Database schema
- Database migrations
- RLS policies
- Authentication logic
- Authorization logic
- Tenant isolation
- API contracts
- Server actions
- Server-side business logic
- Data models
- Validation rules
- Existing CRUD behavior
- Existing routing behavior
- Existing security mechanisms
- Existing backend architecture

Do not “clean up” backend code while working on UI.

If a backend change appears necessary for a UI task:
1. Stop.
2. Explain why it appears necessary.
3. Do not modify it unless explicitly authorized.

### Preserve functionality

UI changes must preserve all existing functionality.

Before modifying a component:
1. Inspect its current implementation.
2. Understand its data flow and event handlers.
3. Understand loading, error, empty, success, and disabled states.
4. Modify only the presentation/interaction layer required by the task.
5. Verify that existing behavior still works.

---

# 3. COLOR SYSTEM

## Primary brand direction

The primary brand language is based around:

- Electric Violet / Violet
- Slate Blue / Dark Periwinkle

Use these as the primary interactive/accent family.

The violet/blue accent should be **strong and noticeable**, not hidden.

However:

> Strong accent ≠ purple everywhere.

Purple/violet should establish hierarchy and brand identity, not dominate every surface.

---

## Secondary/background palette

These colors are approved for page-specific backgrounds and atmospheric gradients:

- `#CAF0F8`
- `#90E0EF`
- `#00B4D8`

They may be used individually on different pages/sections where appropriate.

Do NOT force all three into every gradient.

Prefer:
- subtle multi-stop gradients
- radial background glows
- soft atmospheric washes
- large low-opacity color fields

Avoid:
- flat solid cyan backgrounds
- loud neon backgrounds
- rainbow gradients
- excessive multi-color gradients

---

## Background philosophy

No dark mode is required.

The primary interface should remain light.

Do not make every page a plain solid white background.

Instead, create visual depth using:
- very subtle gradients
- atmospheric background glows
- soft radial gradients
- occasional animated background gradients
- restrained decorative shapes
- very subtle grain/noise texture where appropriate

Content surfaces must remain highly readable.

---

# 4. GLASSMORPHISM — CONTROLLED USE

Glass effects may be used selectively.

Approved glass characteristics:

- Semi-transparent white surfaces
- Backdrop blur
- Frosted appearance
- Thin translucent white borders
- Soft shadows
- Layered depth
- Background color/glow visible through the surface

Glass must NOT become the default style for every card.

### Avoid

- Excessive glassmorphism
- Heavy blur that hurts readability
- Transparent text areas
- Excessively reflective-looking panels
- Glass on top of glass on top of glass
- Huge floating translucent cards

Use glass where it adds hierarchy or visual richness.

---

# 5. CARDS

Preferred card direction:

### Premium soft/glass card

Characteristics:
- Moderate corner radius
- Thin subtle border
- Soft shadow
- Clear hierarchy
- Comfortable internal spacing
- Light background
- Occasional translucent/glass treatment
- Strong typography hierarchy

Cards should feel lightweight and premium.

### Explicitly avoid

- Huge rounded rectangles everywhere
- Excessive corner radius
- Excessive shadows
- Thick borders
- Generic dashboard cards
- Card nesting without purpose

Not every section needs to be a card.

Use whitespace as a design element.

---

# 6. TYPOGRAPHY

Use an Inter-like modern UI typography system.

Preferred characteristics:
- Crisp
- Highly legible
- Modern Neo-Grotesque Sans-Serif
- Strong hierarchy
- Comfortable line height
- High contrast for important content

### Hierarchy

Page titles:
- Bold
- Strong
- Clear
- Not unnecessarily oversized

Section headings:
- Medium/Bold

Supporting text:
- Smaller
- Muted gray
- Comfortable contrast

Inputs:
- High readability
- Clear labels
- Clear placeholder hierarchy

Tables:
- Small muted medium-weight headers
- Dark readable body text

Never sacrifice readability for aesthetics.

---

# 7. LAYOUT

Storefy should feel like a real SaaS application.

## Desktop

Use:
- Fixed left sidebar
- Main content area
- Consistent max-width/content rhythm
- Strong spacing system
- Clear page hierarchy

The sidebar should feel like part of the product identity, not a generic admin template.

## Responsive

Must be:
- Fully responsive
- Mobile SaaS-quality
- Touch-friendly
- No horizontal overflow
- No broken cards
- No clipped tables
- No unusably small controls

Mobile should be intentionally designed, not simply desktop compressed.

---

# 8. SIDEBAR

The sidebar is a primary navigation component.

Use:
- Clean hierarchy
- Strong active state
- Premium iconography
- Subtle micro-animation
- Clear grouping
- Consistent spacing

Active navigation can use:
- Violet/indigo accent
- Soft tinted background
- Accent indicator
- Subtle glow where appropriate

Avoid:
- Giant glowing active items
- Excessive animation
- Rainbow navigation
- Overly decorative sidebar backgrounds

---

# 9. BUTTONS

Buttons must feel premium and responsive.

## Primary button

Hover behavior may combine:
- Background transition
- Subtle shadow
- Small scale increase
- Controlled glow where appropriate

Do NOT use every effect simultaneously on every button.

## Button shapes

Button shape depends on function:
- Primary actions may use moderately rounded shapes
- Compact controls may use smaller radius
- Destructive actions should remain clear and restrained
- Icon buttons may use compact rounded containers

Avoid:
- Every button being a giant pill
- Excessive glow
- Cartoonish hover effects
- Slow transitions

### Interaction

Buttons should provide clear states:
- Default
- Hover
- Active/pressed
- Focus-visible
- Disabled
- Loading

Use smooth premium transitions.

---

# 10. ICONS

Icons are important visual language.

Use:
- Consistent icon library/style
- Appropriate stroke weight
- Icon + text where useful
- Icon-only buttons only when the meaning is obvious or a tooltip is available

Icons should improve scanning, not become decoration for decoration's sake.

---

# 11. STATUS BADGES

Preferred style:

- Subtle pill badges
- Ghost tags
- Soft state chips

Use:
- Very light tint background
- Stronger same-family foreground text
- Moderate rounded corners
- Clear contrast

Avoid:
- Heavy solid badges
- Neon colors
- Oversaturated backgrounds
- Huge capsules

Statuses should be recognizable immediately but visually quiet.

---

# 12. DATA TABLES

Use:

> **Clean SaaS Data Table with a Soft Card Layout**

Characteristics:
- Rounded parent container
- Soft border
- Flat/borderless row dividers
- Off-white/light neutral surface
- Dark readable body text
- Muted medium-weight headers
- Pastel status chips
- Comfortable row height
- Strong column alignment
- Clear action area

Tables should feel like modern SaaS product interfaces.

Avoid:
- Dense old-school enterprise tables
- Excessive grid lines
- Heavy borders around every cell
- Tiny unreadable text

On mobile, tables must have a deliberate responsive strategy.

---

# 13. FORMS

Forms should feel like premium SaaS product-creation interfaces.

Use a clean, high-legibility grid.

### Preferred structure

Where the page/function justifies it:

**Two-column master layout**
- Left: main form / upload / configuration
- Right: sticky or floating live preview/context panel

Do not force this structure onto forms where it does not make functional sense.

### Input system

Use:
- Clear labels
- Strong focus states
- Consistent height
- Consistent spacing
- Clear validation
- Helpful descriptions
- Responsive grid
- Strong visual grouping

Focus color:
- Deep indigo/violet, approximately `#6366F1` or a harmonious Storefy violet variant

### Selectable option cards

For multi-choice selections:
- Card-based radio/selection UI
- Round selection indicator
- Bold title
- Muted supporting description
- Clear selected state

### Description fields

Use full-width textarea when appropriate.

### File upload

For upload workflows:
- Large clear dropzone
- Dashed border
- Strong upload icon
- Clear CTA
- Helpful supporting text
- Drag/drop state where applicable

Do not make every form look like an NFT marketplace form. Adapt the pattern to the actual Storefy functionality.

---

# 14. PRODUCT PREVIEW

When a product-creation/editing workflow has enough information to justify a preview:

Use a visually rich preview panel.

The preview should:
- Update dynamically
- Reflect relevant form values
- Have strong visual hierarchy
- Feel like a real storefront preview
- Remain readable
- Work responsively

On desktop, it may be sticky.

On mobile, place it in a logical position rather than forcing sticky behavior.

---

# 15. TOASTS / NOTIFICATIONS

Use a modern Sonner-style notification system.

Preferred:
- Icon
- Short message
- Clear state
- Subtle entrance animation
- Appropriate semantic treatment
- Smooth exit

States:
- Success
- Error
- Warning
- Information

Avoid:
- Giant notifications
- Long paragraphs
- Aggressive colors
- Loud animation

---

# 16. ANIMATION & MOTION

Motion direction:

> **Premium subtle motion + page transitions + card entrance + micro-animated sidebar**

Use:
- Smooth page transitions
- Subtle card entrance
- Small hover transitions
- Sidebar micro-animation
- Modal transitions
- Toast entrance/exit
- Background gradient motion on selected pages

Motion should communicate:
- hierarchy
- interaction
- state
- continuity

Not decoration alone.

### Motion rules

Prefer:
- Fast, smooth easing
- Small transforms
- Opacity transitions
- Controlled blur/scale
- Subtle spring-like motion where appropriate

Avoid:
- Excessive bouncing
- Large scale animations
- Constant movement
- Animation on every element
- Long transitions that slow interaction

Respect `prefers-reduced-motion`.

---

# 17. VISUAL EFFECTS

Approved effects:

- Gradient
- Subtle background glow
- Selective glass effect
- Background blur
- Soft shadows
- Animated gradients on selected pages
- Hover glow, especially for interactive/icon elements
- Very subtle noise/grain texture
- Decorative abstract shapes

These are ingredients, not requirements for every component.

### Design principle

Use visual effects to create:
- depth
- hierarchy
- atmosphere
- brand identity

Never use effects simply because they are available.

---

# 18. SPACING & DENSITY

The interface should feel spacious but not wasteful.

Use:
- Consistent spacing scale
- Generous page padding
- Comfortable card padding
- Clear section separation
- Strong alignment

Avoid:
- Everything touching
- Excessive empty space
- Random spacing values
- Every section being boxed

Whitespace should create hierarchy.

---

# 19. REFERENCE QUALITY BAR

The visual quality target is:

**Shopify-level SaaS/product clarity + Apple-like polish + premium modern SaaS aesthetics.**

This does NOT mean copying Shopify or Apple.

Extract principles:
- clarity
- hierarchy
- restraint
- consistency
- polished interactions
- professional product language

Do not copy proprietary layouts or branding.

---

# 20. EXPLICITLY FORBIDDEN DESIGN PATTERNS

Never drift into:

- ❌ Excessive gradients
- ❌ Excessive glassmorphism
- ❌ Huge rounded cards
- ❌ Childish colors
- ❌ Excessive animation
- ❌ Purple everywhere
- ❌ Generic dashboard UI
- ❌ Bootstrap-looking UI
- ❌ Template-looking UI
- ❌ Excessive shadows
- ❌ Excessive pills
- ❌ Giant hero typography in ordinary dashboard pages
- ❌ Random decorative elements
- ❌ Poor contrast
- ❌ Low-information-density layouts
- ❌ Inconsistent spacing
- ❌ Inconsistent border radii
- ❌ Random icon styles

---

# 21. UI IMPLEMENTATION WORKFLOW FOR KILOCODE

Before changing any UI:

### Step 1 — Inspect

Inspect:
- Existing component
- Parent layout
- Existing design system
- Existing shadcn/Radix components
- Existing Tailwind utilities
- Existing global CSS
- Existing icons
- Existing responsive behavior
- Existing states

Do not immediately start rewriting.

### Step 2 — Identify the visual problem

Determine:
- What currently looks generic?
- What lacks hierarchy?
- What spacing is wrong?
- What typography is weak?
- What interaction is unclear?
- What looks inconsistent with Storefy?
- What can be improved without changing functionality?

### Step 3 — Design

Create a coherent visual solution using this document.

### Step 4 — Implement

Modify only the UI/presentation layer necessary.

Reuse existing components where appropriate.

Do not introduce a new UI library just for the sake of introducing one.

### Step 5 — Responsive pass

Check:
- Desktop
- Tablet
- Mobile

### Step 6 — Interaction pass

Check:
- Hover
- Focus
- Active
- Disabled
- Loading
- Error
- Empty
- Success

### Step 7 — Regression pass

Confirm:
- Existing functionality still works
- API requests are unchanged
- Database behavior is unchanged
- Authentication is unchanged
- Tenant isolation is unchanged
- No unrelated UI was broken

---

# 22. WHEN A MODULE PROMPT IS PROVIDED

Every future Storefy module prompt will explicitly reference:

> **MUST_UI_DESIGN.md**

When that happens:

**You MUST read and follow this file before implementing ANY UI change.**

This applies even when the change is tiny.

Examples:
- Changing one button
- Adding an icon
- Changing a form field
- Adding a table action
- Adding a modal
- Changing a sidebar item
- Adding an empty state
- Changing a toast
- Adjusting mobile layout

A small UI change is still a Storefy UI change.

---

# 23. DO NOT OVER-INTERPRET THE DESIGN

Do not blindly apply every design technique to every page.

The goal is:

**Balanced premium SaaS UI.**

Use the minimum visual complexity necessary to achieve the desired result.

If a simple solution looks more premium, use the simple solution.

---

# 24. FINAL QUALITY CHECK

Before declaring any UI module complete, ask:

1. Does this look like a real SaaS product?
2. Does it feel trustworthy?
3. Is the hierarchy immediately understandable?
4. Is the violet/blue brand identity visible without becoming excessive?
5. Are backgrounds visually interesting but readable?
6. Are gradients controlled?
7. Is glass used selectively?
8. Are shadows subtle?
9. Are buttons responsive and premium?
10. Are icons consistent?
11. Are status badges subtle?
12. Are tables clean and modern?
13. Are forms professional and easy to scan?
14. Are animations subtle?
15. Does mobile feel intentionally designed?
16. Does anything look like a generic template?
17. Did any backend/database/security behavior change?
18. Did any unrelated UI change?

If the answer to #16 is yes, redesign that portion before finishing.

If the answer to #17 is yes, revert the unrelated backend/database/security change unless explicitly authorized.

---

# 25. MASTER PRINCIPLE

> **Storefy should look expensive without looking excessive.**

The interface should combine:
- Apple-like restraint
- Modern SaaS clarity
- Violet/blue brand energy
- Premium visual depth
- Professional information architecture
- Subtle motion
- Excellent readability
- Strong responsive behavior

The final result must feel like a product that could be launched and trusted by real businesses.
