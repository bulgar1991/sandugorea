// Site-wide constants used for SEO tags and the page loader.

export const SITE_NAME = 'Sandugorea';
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
 * Set to null until a real one exists - then no og:image is sent.
 */
export const SITE_SHARE_IMAGE: {
  path: string;
  alt: string;
  type: string;
  width: number;
  height: number;
} | null = null;
