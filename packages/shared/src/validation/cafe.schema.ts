import { z } from 'zod';

export const updateCafeProfileSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/).optional(),
  fssaiNumber: z.string().max(50).optional().nullable(),
});

export const updateCafeSettingsSchema = z.object({
  kitchenMode: z.boolean().optional(),
  allowPayAtEnd: z.boolean().optional(),
  useManagerLogin: z.boolean().optional(),
  gstEnabled: z.boolean().optional(),
  gstRate: z.number().int().min(0).max(3000).optional(), // up to 30%
  serviceChargeEnabled: z.boolean().optional(),
  serviceChargeRate: z.number().int().min(0).max(3000).optional(),
  defaultPrepTimeMin: z.number().int().min(1).max(120).optional(),
  requireOwnerApprovalForRefund: z.boolean().optional(),
});

export const uploadDocumentMetadataSchema = z.object({
  type: z.enum(['business_registration', 'fssai', 'gstin', 'owner_id_proof', 'cafe_photo']),
  documentNumber: z.string().max(100).optional(),
  expiryDate: z.string().datetime().optional().nullable(),
});

