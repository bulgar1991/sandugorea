/** Portfolio categories; each has its own page at /portfolio/<id>. */
export type PhotoCategory = 'events' | 'family' | 'commercial' | 'landscapes';

export interface PortfolioPhoto {
  id: string;
  src: string;
  thumb: string;
  category: PhotoCategory;
  /** Used for layout only (grid spans / aspect). */
  orientation: 'portrait' | 'landscape' | 'square';
}

/** Minimal shape the lightbox needs. */
export interface LightboxItem {
  src: string;
  title?: string;
  /** Download link (defaults to `src`). */
  download?: string;
  downloadName?: string;
}
