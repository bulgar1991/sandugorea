/** Route `data.seo`: translation keys (under "seo" in public/i18n/*.json). */
export interface SeoData {
  title: string;
  description?: string;
  /** Translation keys filled into {{placeholders}} of title/description. */
  params?: Record<string, string>;
  /** og:type, default "website". */
  type?: string;
  /** Path under /public for a page-specific share image. */
  image?: string;
  /** Extra tags, e.g. robots noindex for private pages. Content is a translation key or plain text. */
  metaTags?: { name?: string; property?: string; content: string }[];
}
