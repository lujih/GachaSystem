---
name: Vivid Pulse
colors:
  surface: '#faf9fe'
  surface-dim: '#dad9de'
  surface-bright: '#faf9fe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f8'
  surface-container: '#eeedf2'
  surface-container-high: '#e9e7ed'
  surface-container-highest: '#e3e2e7'
  on-surface: '#1a1b1f'
  on-surface-variant: '#554148'
  inverse-surface: '#2f3034'
  inverse-on-surface: '#f1f0f5'
  outline: '#887178'
  outline-variant: '#dbbfc7'
  surface-tint: '#a63067'
  primary: '#a63067'
  on-primary: '#ffffff'
  primary-container: '#ff77af'
  on-primary-container: '#770143'
  inverse-primary: '#ffb0cb'
  secondary: '#006783'
  on-secondary: '#ffffff'
  secondary-container: '#5dd1fd'
  on-secondary-container: '#005870'
  tertiary: '#705d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#c3a200'
  on-tertiary-container: '#473a00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9e4'
  primary-fixed-dim: '#ffb0cb'
  on-primary-fixed: '#3e0020'
  on-primary-fixed-variant: '#87154f'
  secondary-fixed: '#bce9ff'
  secondary-fixed-dim: '#63d3ff'
  on-secondary-fixed: '#001f29'
  on-secondary-fixed-variant: '#004d63'
  tertiary-fixed: '#ffe173'
  tertiary-fixed-dim: '#e8c426'
  on-tertiary-fixed: '#221b00'
  on-tertiary-fixed-variant: '#554500'
  background: '#faf9fe'
  on-background: '#1a1b1f'
  surface-variant: '#e3e2e7'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.6'
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
  button-text:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '800'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  margin: 24px
---

## Brand & Style

The design system is engineered to evoke the high-energy, emotive atmosphere of modern "slice-of-life" and "action-fantasy" anime. It targets a demographic that appreciates expressive visual storytelling and high-fidelity character art. The emotional core is **Radiant Optimism**: every interaction should feel like a celebration, utilizing "kawaii" aesthetics blended with sleek, modern digital trends.

The style is a hybrid of **High-Contrast Bold** and **Tactile Glassmorphism**. It utilizes thick, colored outlines to anchor elements against vibrant backgrounds, while maintaining a sense of depth through semi-transparent panels. Visual interest is sustained through "FX-layering"—the inclusion of static decorative motifs like 4-pointed stars, halftone patterns, and speed-line accents that react to user input.

## Colors

The palette is anchored by "Electric Sakura" (Primary Pink), supported by "Cyan Sky" (Secondary Blue) and "Impact Yellow" (Tertiary). These are high-saturation hues designed to pop against a crisp, warm-white background. 

Contrast is maintained through the use of a deep charcoal neutral for text and heavy outlines, ensuring accessibility despite the pastel base. Color is used functionally: Pink for progression and primary actions, Blue for information and navigation, and Yellow for "Ultra Rare" highlights and premium currency.

## Typography

This design system utilizes **Plus Jakarta Sans** for headlines and UI labels to provide a friendly, geometric, and slightly rounded feel that matches the anime aesthetic. For long-form text and character descriptions, **Be Vietnam Pro** is used for its superior readability and contemporary warmth. 

Headlines should often be treated with a 2px to 4px outside stroke (matching the neutral color) to mimic anime title cards. Letter spacing is tight on displays for a compact, energetic feel, while labels use expanded tracking for better legibility during high-speed gameplay.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a heavy emphasis on safe zones for character art. A 12-column system is used for menu screens, while the HUD (Heads-Up Display) utilizes an "Anchor & Offset" model, pinning elements to the corners with dynamic padding.

Spacing is generous to prevent the vibrant colors from becoming overwhelming. Content containers should utilize "Asymmetric Padding"—often having slightly more bottom padding than top—to give a bouncy, gravity-defying feel common in anime UI.

## Elevation & Depth

Hierarchy is achieved through **Bold Outlines** and **Layered Translucency**. 
- **Level 1 (Base):** Solid white or very pale pink surfaces with a 2px neutral border.
- **Level 2 (Interactive):** Elements feature a "Hard Drop Shadow"—a solid color offset (usually 4px) rather than a soft blur, creating a sticker-like appearance.
- **Level 3 (Modals):** Large containers use a high-blur backdrop filter (glassmorphism) tinted with the primary color, layered under a solid-bordered frame.

Floating decorative "Sparkles" (star icons) should exist on a separate Z-index plane between the background and the foreground UI to create parallax depth.

## Shapes

The shape language is dominated by **Large Radii** and **Circular Motifs**. Standard containers use a 0.5rem (8px) radius, but primary action buttons and "Hero" cards are pushed to 1.5rem (24px) or full pill-shapes to emphasize a friendly, non-aggressive tone.

Special decorative elements should break the bounding box. For example, a character card might have a star icon or a "New!" badge that overlaps the corner, breaking the rigid geometry with organic, playful placement.

## Components

- **Buttons:** Large, pill-shaped, and featuring a 3D "press" effect. On hover, the hard drop shadow disappears, and the button shifts 2px down and right. Use "Impact Yellow" for Gacha pull buttons.
- **Character Cards:** Feature a slight 5-degree tilt on hover. Use a thick 3px outline that matches the character's elemental color.
- **Chips/Badges:** Small, fully rounded capsules with white text and a dark stroke. Use these for elemental types (Fire, Water, etc.).
- **Input Fields:** Soft pink background with a 2px solid border that turns Cyan Sky when focused. Use a playful "floating label" that bounces when activated.
- **Gacha Banners:** Use "Halftone" pattern overlays on the background and high-gloss "Glass" overlays for the prize preview text.
- **Progress Bars:** Thick, rounded bars where the fill is a gradient of Primary Pink to Secondary Blue, featuring a moving white "sheen" highlight to simulate light reflecting off a liquid surface.