/**
 * Configuration for site verification script.
 * Tests live site for v0.1 fixes completion status.
 */

export const SITE_URL = 'https://www.hotboxclothing.shop';

export const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
} as const;

export const TIMEOUTS = {
  /** Per-check timeout in milliseconds */
  perCheck: 30_000,
  /** Page navigation timeout in milliseconds */
  navigation: 30_000,
  /** Network idle timeout in milliseconds */
  networkIdle: 15_000,
} as const;

/** Known page URLs for slug verification */
export const KNOWN_PAGES = {
  home: '/',
  shopAll: '/shop-all',
  funShirts: '/fun-shirts',
  bigBarn: '/shop',
  artistryInMotion: '/shop-1',
  fallPreOrder: '/shop-2',
  unmh: '/shop-3',
  board30: '/shop-4',
  contact: '/blank-2',
  support: '/blank-3',
  storePolicies: '/blank-4',
} as const;

/** Default URL slugs from WIX that should be renamed */
export const BAD_SLUGS = ['/shop-1', '/shop-2', '/shop-3', '/shop-4', '/blank-2', '/blank-3', '/blank-4'];
