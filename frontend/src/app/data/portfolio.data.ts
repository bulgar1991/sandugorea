import { PhotoCategory, PortfolioPhoto } from '@models/photo.models';

/**
 * Placeholder imagery (picsum.photos). Replace with the photographer's own work:
 * put files in /public/images and point `src` / `thumb` at them.
 * All visible text lives in public/i18n/*.json - here we only keep translation keys.
 */
const img = (seed: string, w: number, h: number) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const CATEGORY_IDS: PhotoCategory[] = [
  'weddings',
  'portraits',
  'family',
  'events',
  'landscapes',
];

export const CATEGORIES = CATEGORY_IDS.map((id) => ({
  id,
  labelKey: `categories.${id}.label`,
  blurbKey: `categories.${id}.blurb`,
  cover: img(`sg-cat-${id}`, 1400, 1600),
}));

const SHAPES: Record<PortfolioPhoto['orientation'], [number, number]> = {
  portrait: [800, 1100],
  landscape: [1200, 800],
  square: [1000, 1000],
};

// Repeating pattern that makes the works grid look composed rather than random.
const ORIENTATIONS: PortfolioPhoto['orientation'][] = [
  'portrait',
  'square',
  'landscape',
  'square',
  'square',
  'portrait',
  'square',
  'landscape',
];

/** Latest works, newest first. */
export const PORTFOLIO: PortfolioPhoto[] = Array.from({ length: 25 }, (_, i) => {
  const category = CATEGORY_IDS[i % CATEGORY_IDS.length];
  const orientation = ORIENTATIONS[i % ORIENTATIONS.length];
  const [w, h] = SHAPES[orientation];
  const seed = `sg-work-${i}`;
  return {
    id: seed,
    category,
    orientation,
    src: img(seed, w * 2, h * 2),
    thumb: img(seed, w, h),
  };
});

/**
 * Hero portrait. For the "stepping out of the frame" look use a cut-out photo with a
 * transparent background: put it in /public/images/hero-portrait.png and set `cutout: true`.
 */
export const HERO_PORTRAIT = {
  // Placeholder: a photographer with a vintage camera (picsum #91).
  src: 'https://picsum.photos/id/91/900/1200',
  cutout: false,
};

export const TESTIMONIALS = ['t1', 't2', 't3', 't4', 't5'].map((id, i) => ({
  id,
  quoteKey: `testimonials.items.${id}.quote`,
  authorKey: `testimonials.items.${id}.author`,
  detailKey: `testimonials.items.${id}.detail`,
  avatar: img(`sg-face-${i}`, 160, 160),
}));

export const BRAND = {
  name: 'Sandugorea',
  /** Shown in the hero: "Hi, I'm <owner>". */
  owner: 'Sandu Gorea',
  email: 'hello@sandugorea.ch',
  phone: '+40 700 000 000',
  instagram: 'https://instagram.com/',
};

export const imageUrl = img;
