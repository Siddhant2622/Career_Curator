# Design System Specification: High-End Editorial ATS Experience

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Career Curator."** 

Moving away from the cluttered, "dashboard-heavy" look of traditional HR software, this system adopts an editorial approach to data visualization. It treats a candidate's resume analysis like a premium magazine spread—balanced, authoritative, and spacious. We achieve this through "Soft Minimalism," replacing aggressive grid lines with tonal shifts, intentional asymmetry, and a sophisticated layering of surfaces. The interface should feel less like a "scanner" and more like a high-end consultation.

## 2. Colors & Surface Philosophy

The palette is anchored in professional reliability with a spectrum of cognitive states (Success, Warning, Critical) expressed through Material Design logic.

### The "No-Line" Rule
To maintain a premium, bespoke feel, **1px solid borders are prohibited for sectioning.** Structural boundaries must be defined through background color shifts. For example, a main content area using `surface-container-low` should sit directly on a `background` without a stroke.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine paper. 
- **Base Layer:** `background` (#f7f9fb)
- **Secondary Sectioning:** `surface-container-low` (#f2f4f6)
- **Interactive/Primary Cards:** `surface-container-lowest` (#ffffff)
- **Elevated Modals:** `surface-bright` (#f7f9fb) with Glassmorphism.

### The "Glass & Gradient" Rule
To add "soul" to the SaaS experience:
- **Glassmorphism:** Floating elements (like the "Issues Found" badge) should use semi-transparent `surface_container_lowest` with a `backdrop-blur` of 12px.
- **Signature Gradients:** Main CTAs should not be flat. Use a subtle linear gradient from `primary` (#004ac6) to `primary_container` (#2563eb) at a 135-degree angle to provide depth.

## 3. Typography: Editorial Authority

We use a dual-font strategy to balance character with readability.

*   **Display & Headlines (Manrope):** Chosen for its geometric precision and modern "tech-editorial" feel. 
    *   *Display-LG/MD:* Use these for high-impact scores (e.g., "57/100").
    *   *Headline-SM:* Use for section titles (e.g., "ATS PARSE RATE") with increased letter-spacing (0.05em) to mimic premium print.
*   **Body & Labels (Inter):** The workhorse for data.
    *   *Body-MD:* The primary reading grade for analysis text.
    *   *Label-SM/MD:* Used for keyword tags and metadata. Use `on_surface_variant` (#434655) to reduce visual noise in secondary information.

The hierarchy is strictly enforced to guide the eye from the "Big Picture" (Score) to "Micro-Details" (Keyword Matches) without cognitive overload.

## 4. Elevation & Depth

### Tonal Layering
Depth is achieved by "stacking" the surface-container tiers. Place a `surface-container-lowest` card on a `surface-container-low` section to create a soft, natural lift. This mimics the way paper casts a shadow on paper under ambient light.

### Ambient Shadows
Shadows must be "breathable." 
- **Standard Card:** `shadow-md` using a 6% opacity of the `on_surface` color, with a blur radius of 24px and a 4px Y-offset.
- **Shadow Tinting:** Never use pure black (#000) for shadows. Tint the shadow with a hint of our `primary` color to keep the "Light Mode" feeling fresh and integrated.

### The Ghost Border
If a border is required for accessibility (e.g., input fields), use the **Ghost Border**: the `outline-variant` token at 15% opacity. High-contrast, 100% opaque borders are strictly forbidden.

## 5. Components

### Prominent CTA Buttons
- **Style:** `rounded-xl` (1.5rem) with a subtle gradient transition.
- **Elevation:** Use a `shadow-sm` that expands on hover.
- **States:** Primary buttons use `on_primary` text; Tertiary buttons use `primary` text with no background until hover.

### Progress & Score Visuals
- **Track:** `surface-container-highest` (#e0e3e5).
- **Fill:** A horizontal gradient from `secondary_container` to `secondary` for "Success" states. 
- **Marker:** Use the `secondary` pin icon (as seen in reference) to indicate the exact percentage, providing a tactile, "analog" feel to digital data.

### Keyword Tags (Matched/Missing)
- **Matched:** `secondary_fixed` background with `on_secondary_fixed_variant` text.
- **Missing/Issue:** `error_container` background with `on_error_container` text.
- **Shape:** Pill-shaped (`rounded-full`) to contrast against the `xl` (1.5rem) radius of the parent cards.

### Input Fields
- **Background:** `surface-container-low`.
- **Active State:** Transitions to `surface-container-lowest` with a 1px "Ghost Border" in `primary`.
- **Typography:** Labels use `label-md` in `on_surface_variant`.

### Analysis Cards
- **Construction:** Use `rounded-xl` corners. 
- **Spacing:** Minimum 32px (2rem) internal padding. 
- **Separation:** Forbid dividers. Use 24px of vertical whitespace or a transition from `surface-container-low` to `surface-container-lowest` to denote a new content block.

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical layouts (e.g., a 1/3 sidebar for the score and 2/3 main area for content) to create a premium editorial feel.
*   **Do** lean heavily into whitespace. If a section feels crowded, double the padding.
*   **Do** use `backdrop-blur` on top-level navigation or floating alerts to maintain context of the content underneath.

### Don't
*   **Don't** use lines to separate list items. Use background-color alternating or simple vertical rhythm.
*   **Don't** use high-saturation reds or greens for large areas. Keep high chroma for small semantic indicators (icons, tags).
*   **Don't** use "Standard" 4px or 8px border radii. This system requires the `xl` (1.5rem) radius to achieve its signature soft-organic look.