import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  imageUrl: z.string().url().max(500).optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  scheduleStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().nullable(),
  scheduleEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createItemSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  imageUrl: z.string().url().max(500).optional().nullable(),
  pricePaise: z.number().int().min(0),
  isVeg: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  isSoldOut: z.boolean().default(false),
  prepTimeMin: z.number().int().min(1).max(180).optional().nullable(),
  allergenInfo: z.string().max(500).optional().nullable(),
  spicyLevel: z.number().int().min(0).max(5).default(0),
  sortOrder: z.number().int().default(0),
});

export const updateItemSchema = createItemSchema.partial();

export const bulkAvailabilitySchema = z.object({
  itemIds: z.array(z.string()),
  isAvailable: z.boolean().optional(),
  isSoldOut: z.boolean().optional(),
});

export const createOptionGroupSchema = z.object({
  name: z.string().min(1).max(255),
  isRequired: z.boolean().default(false),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(1).default(1),
  sortOrder: z.number().int().default(0),
});

export const createOptionSchema = z.object({
  name: z.string().min(1).max(255),
  extraPricePaise: z.number().int().min(0).default(0),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

