// Site-wide constants used for SEO tags and the page loader.

export const SITE_NAME = 'Sandu Gorea';
export const SITE_URL = 'https://sandugorea.ch';

/** Open Graph locale per site language (Swiss variants for the Swiss domain). */
export const OG_LOCALES: Record<string, string> = {
  en: 'en_US',
  de: 'de_CH',
  it: 'it_CH',
  fr: 'fr_CH',
  ro: 'ro_RO',
};

/**
 * Default image for link previews (WhatsApp, Facebook, LinkedIn…): 1200×630 JPG in /public.
 * Keep in sync with the og:image tags in src/index.html.
 */
export const SITE_SHARE_IMAGE: {
  path: string;
  alt: string;
  type: string;
  width: number;
  height: number;
} | null = {
  path: 'og-image.jpg',
  alt: 'seo.shareImageAlt',
  type: 'image/jpeg',
  width: 1200,
  height: 630,
};
