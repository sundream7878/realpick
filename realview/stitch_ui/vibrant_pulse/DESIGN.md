---
name: Vibrant Pulse
colors:
  surface: '#f6fafe'
  surface-dim: '#d6dade'
  surface-bright: '#f6fafe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f4f8'
  surface-container: '#eaeef2'
  surface-container-high: '#e4e9ed'
  surface-container-highest: '#dfe3e7'
  on-surface: '#171c1f'
  on-surface-variant: '#5b4041'
  inverse-surface: '#2c3134'
  inverse-on-surface: '#edf1f5'
  outline: '#8f6f71'
  outline-variant: '#e3bdbf'
  surface-tint: '#bc0b3b'
  primary: '#b90538'
  on-primary: '#ffffff'
  primary-container: '#dc2c4f'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb2b7'
  secondary: '#575e70'
  on-secondary: '#ffffff'
  secondary-container: '#d9dff5'
  on-secondary-container: '#5c6274'
  tertiary: '#006a43'
  on-tertiary: '#ffffff'
  tertiary-container: '#008656'
  on-tertiary-container: '#f6fff6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdadb'
  primary-fixed-dim: '#ffb2b7'
  on-primary-fixed: '#40000d'
  on-primary-fixed-variant: '#92002a'
  secondary-fixed: '#dce2f7'
  secondary-fixed-dim: '#c0c6db'
  on-secondary-fixed: '#141b2b'
  on-secondary-fixed-variant: '#404758'
  tertiary-fixed: '#82f9ba'
  tertiary-fixed-dim: '#64dca0'
  on-tertiary-fixed: '#002112'
  on-tertiary-fixed-variant: '#005233'
  background: '#f6fafe'
  on-background: '#171c1f'
  surface-variant: '#dfe3e7'
  surface-subtle: '#FDF2F8'
  white: '#FFFFFF'
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-md:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 20px
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
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 12px
  margin-mobile: 16px
---

## Brand & Style

The design system is centered on the concept of a "Broadcast Companion"—a professional yet approachable digital concierge for reality television viewers. The brand personality balances the excitement of entertainment with the utility of a high-performance data tool. It must feel fast, trustworthy, and modern, catering to users who want instant access to contestant information while watching a live show.

The chosen design style is **Corporate Modern with a Soft Edge**. This combines the rigorous information density of SaaS platforms with the playful, "cute" aesthetics of consumer-facing social apps. The interface utilizes generous rounded corners, vibrant point colors, and a clean, systematic layout to ensure high legibility on mobile devices while maintaining a friendly, welcoming atmosphere.

## Colors

The palette is designed for high-contrast readability and brand recognition. The **Primary Vibrant Pink** (#F43F5E) is the "action" color, reserved for key CTAs and the prominent OCR camera trigger. The **Secondary Navy** (#111827) provides grounding and authority, used primarily for card backgrounds or high-emphasis headers to create a "professional" depth.

The background uses a **Neutral Off-white** (#F1F5F9) to reduce screen glare during long viewing sessions, while a **Subtle Pink Surface** (#FDF2F8) is employed for secondary containers, highlights, or active states to reinforce the brand's "cute" and welcoming side without sacrificing professionalism.

## Typography

This design system utilizes **Geist** for its exceptional legibility in data-heavy environments. The typeface’s technical precision ensures that contestant stats, names, and descriptions remain clear even at small sizes on mobile screens.

We employ a tight typographic scale. Headlines use a bold weight with slightly negative letter spacing to create a compact, "news-like" authority. Body text is optimized for density; `body-sm` and `label-md` are critical for the compact info cards, where information must be parsed at a glance. All labels should be rendered in uppercase when used for categorization to distinguish them from descriptive body copy.

## Layout & Spacing

As a mobile-first PWA, the layout follows a **fluid grid** model optimized for narrow viewports. The horizontal margin is fixed at 16px to maximize the real estate for contestant cards. We use an 8px-based spacing system to maintain a rhythmic vertical flow.

Information density is achieved through the use of "compact containers." On desktop, a 12-column grid is used, but content is typically centered in a max-width container (approx. 480px) to mimic the mobile experience. Gutters between cards are kept tight (12px) to allow more content to be visible above the fold, encouraging a "feed-like" browsing experience.

## Elevation & Depth

Visual hierarchy is established through **Ambient Shadows** and **Tonal Layers**. Rather than harsh borders, we use soft, diffused shadows (Blur: 15px, Opacity: 8%, Color: Navy) to lift cards off the neutral background.

For high-emphasis cards, we use a "Navy Inversion" technique: the card background becomes the Secondary Navy color, and typography shifts to White. This creates a striking visual break in the feed. For interactive elements, a subtle "active" state uses the Subtle Pink surface to provide tactile feedback without adding visual clutter. The OCR camera button sits at the highest elevation, fixed to the bottom-right of the screen with a more pronounced shadow to signify its primary utility.

## Shapes

The shape language is a core driver of the "cute but professional" aesthetic. We use a **Rounded** (0.5rem) baseline for most elements, but contestant cards and primary buttons utilize a **Large Radius** (1rem / 16px) to soften the UI. 

Interactive chips and the floating OCR action button are **Pill-shaped**, providing a distinct visual contrast from the rectangular cards. This variety in corner radii helps the user distinguish between informational containers (rounded) and actionable triggers (pill-shaped).

## Components

### Contestant Cards
The heart of the app. These are compact, vertically stacked cards with a 16px radius. They feature a small profile image (top left or background-flush), high-contrast headers, and key "Stat Chips" (e.g., Age, Occupation) using `body-sm`.

### OCR Camera Button
A large, floating action button (FAB) positioned at the bottom right. It uses the Primary Pink color, a pill shape, and a white camera icon. It must be prominent enough to be the first thing a user sees when they need to identify a contestant.

### Stats & Labels
Small tags or "chips" used within cards. These should have a light pink background (`surface-subtle`) with pink text for a cohesive look. They use `label-md` for maximum density.

### Buttons
Primary buttons are pill-shaped and full-width on mobile to ensure ease of tapping. They utilize the Primary Pink with white text. Secondary actions use the Navy background for a more "utilitarian" look.

### Input Fields
Clean, minimalist inputs with a subtle 1px border in a dark gray. When focused, the border transitions to Primary Pink with a very soft glow to indicate activity.