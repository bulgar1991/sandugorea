export type PhotoCategory = 'weddings' | 'portraits' | 'family' | 'events' | 'landscapes';

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
