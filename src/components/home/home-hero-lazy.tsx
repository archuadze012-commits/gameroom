'use client';

// The home page renders EITHER the guest hero (logged-out visitors) OR the
// authed carousel — never both. But when page.tsx imported both statically,
// Turbopack co-located them into a SINGLE client chunk (both are home-only), so
// every guest downloaded the carousel's JS they'd never see, and every authed
// user downloaded the guest hero + its storm/motion code they'd never see.
//
// Splitting them requires the dynamic() to live in a CLIENT module: per the
// Next.js lazy-loading guide, "When a Server Component dynamically imports a
// Client Component, automatic code splitting is currently not supported" — so
// calling dynamic() straight from the server page.tsx would NOT split. Defined
// here (in a 'use client' module) each hero becomes its own chunk, and only the
// branch actually rendered is fetched. ssr stays on (default) so both heroes
// still prerender — no LCP/CLS regression, just a smaller per-audience bundle.
import dynamic from 'next/dynamic';

export const HomeGuestHero = dynamic(() =>
  import('./home-guest-hero').then((m) => m.HomeGuestHero),
);

export const HomeHeroCarousel = dynamic(() =>
  import('./home-hero-carousel').then((m) => m.HomeHeroCarousel),
);
