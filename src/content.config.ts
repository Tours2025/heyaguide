import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const dayHours = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
  close: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
  closed: z.boolean().default(false),
  lastEntry: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  note: z.string().optional(),
});

const places = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/places' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    category: z.enum([
      'museums',
      'mosques-churches',
      'palaces-historical',
      'markets',
      'viewpoints-towers',
    ]),
    shortDescription: z.string().max(280),
    longDescription: z.string().min(50),
    coordinates: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    address: z.string(),
    hours: z.object({
      monday: dayHours,
      tuesday: dayHours,
      wednesday: dayHours,
      thursday: dayHours,
      friday: dayHours,
      saturday: dayHours,
      sunday: dayHours,
    }),
    admission: z.object({
      foreigner: z.number().nonnegative(),
      currency: z.enum(['EUR', 'USD', 'TRY']),
      notes: z.string().optional(),
    }),
    walkFromHeya: z.string(),
    transitFromHeya: z.string(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    priority: z.number().min(0).max(100).default(50),
    images: z.object({
      hero: z.string(),
      gallery: z.array(z.string()).default([]),
    }),
    imageCredits: z.array(z.object({
      file: z.string(),
      author: z.string(),
      source: z.string(),
      license: z.string(),
      url: z.string().url(),
    })),
  }),
});

export const collections = { places };
