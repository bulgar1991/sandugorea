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

export const HERO_SLIDES = [
  { src: img('sg-hero-1', 2400, 1500), captionKey: 'hero.slides.s1' },
  { src: img('sg-hero-2', 2400, 1500), captionKey: 'hero.slides.s2' },
  { src: img('sg-hero-3', 2400, 1500), captionKey: 'hero.slides.s3' },
  { src: img('sg-hero-4', 2400, 1500), captionKey: 'hero.slides.s4' },
];

export const TESTIMONIALS = ['t1', 't2', 't3', 't4', 't5'].map((id, i) => ({
  id,
  quoteKey: `testimonials.items.${id}.quote`,
  authorKey: `testimonials.items.${id}.author`,
  detailKey: `testimonials.items.${id}.detail`,
  avatar: img(`sg-face-${i}`, 160, 160),
}));

export const BRAND = {
  name: 'Sandugorea',
  email: 'hello@sandugorea.com',
  phone: '+40 700 000 000',
  instagram: 'https://instagram.com/',
};

export const imageUrl = img;
