import { PhotoCategory, PortfolioPhoto } from '@models/photo.models';

/**
 * Placeholder imagery (picsum.photos). Replace with the photographer's own work:
 * put files in /public/images and point `src` / `thumb` at them.
 */
const img = (seed: string, w: number, h: number) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const CATEGORIES: { id: PhotoCategory; label: string; blurb: string; cover: string }[] = [
  {
    id: 'weddings',
    label: 'Weddings',
    blurb: 'Quiet glances, loud laughter, the whole day as it truly felt.',
    cover: img('sg-cat-wed', 900, 1200),
  },
  {
    id: 'portraits',
    label: 'Portraits',
    blurb: 'Honest light and unhurried sessions that let you be yourself.',
    cover: img('sg-cat-por', 900, 1200),
  },
  {
    id: 'family',
    label: 'Family',
    blurb: 'The small, ordinary moments that become everything later.',
    cover: img('sg-cat-fam', 900, 1200),
  },
  {
    id: 'events',
    label: 'Events',
    blurb: 'Atmosphere, people and details, documented with discretion.',
    cover: img('sg-cat-evt', 900, 1200),
  },
  {
    id: 'landscapes',
    label: 'Landscapes',
    blurb: 'Places that stay with you long after the light has gone.',
    cover: img('sg-cat-lan', 900, 1200),
  },
];

const SHAPES: Record<PortfolioPhoto['orientation'], [number, number]> = {
  portrait: [800, 1100],
  landscape: [1200, 800],
  square: [1000, 1000],
};

const ORIENTATION_CYCLE: PortfolioPhoto['orientation'][] = [
  'portrait',
  'landscape',
  'portrait',
  'square',
  'landscape',
];

const TITLES: Record<PhotoCategory, string[]> = {
  weddings: ['First Look', 'Vows at Dusk', 'The Last Dance', 'Golden Veil'],
  portraits: ['Stillness', 'Window Light', 'Elena', 'In Shadow'],
  family: ['Sunday Morning', 'Little Hands', 'Home', 'Seaside'],
  events: ['Gala Night', 'Toast', 'Backstage', 'Confetti'],
  landscapes: ['Northern Fog', 'Salt Lake', 'Highlands', 'Blue Hour'],
};

export const PORTFOLIO: PortfolioPhoto[] = CATEGORIES.flatMap(({ id: category }, ci) =>
  TITLES[category].map((title, i) => {
    const orientation = ORIENTATION_CYCLE[(ci + i) % ORIENTATION_CYCLE.length];
    const [w, h] = SHAPES[orientation];
    const seed = `sg-${category}-${i}`;
    return {
      id: seed,
      title,
      category,
      orientation,
      src: img(seed, w * 2, h * 2),
      thumb: img(seed, w, h),
    };
  }),
);

export const HERO_SLIDES = [
  { src: img('sg-hero-1', 2400, 1500), caption: 'Weddings — Tuscany' },
  { src: img('sg-hero-2', 2400, 1500), caption: 'Portraits — Studio' },
  { src: img('sg-hero-3', 2400, 1500), caption: 'Landscapes — Iceland' },
  { src: img('sg-hero-4', 2400, 1500), caption: 'Family — Black Sea' },
];

export const TESTIMONIALS = [
  {
    quote:
      'We open our gallery every anniversary and cry every single time. She saw moments we did not even know had happened.',
    author: 'Ana & Mihai',
    detail: 'Wedding, 2025',
  },
  {
    quote:
      'Calm, patient and so present. The portraits feel like me on my best day, without trying too hard.',
    author: 'Elena R.',
    detail: 'Portrait session',
  },
  {
    quote:
      'The private gallery made sharing with family effortless. Every photograph felt considered.',
    author: 'The Popescu family',
    detail: 'Family session',
  },
];

export const BRAND = {
  name: 'Sandugorea',
  tagline: 'Photography',
  email: 'hello@sandugorea.com',
  phone: '+40 700 000 000',
  location: 'Bucharest · Available worldwide',
  instagram: 'https://instagram.com/',
};

export const imageUrl = img;
