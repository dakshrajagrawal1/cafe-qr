// ============================================================
// File Upload Middleware (Multer Configuration)
// ============================================================

import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ValidationError } from '../lib/errors.js';

// Allowed MIME types
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DOCUMENT_MIMES = [...IMAGE_MIMES, 'application/pdf'];

// Generate random filename to prevent guessing
function randomFilename(originalname: string): string {
  const ext = path.extname(originalname).toLowerCase();
  const random = crypto.randomBytes(16).toString('hex');
  return `${random}${ext}`;
}

/** Multer storage for public images (menu items, logos, covers) */
const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(env.UPLOAD_DIR, 'images'));
  },
  filename: (_req, file, cb) => {
    cb(null, randomFilename(file.originalname));
  },
});

/** Multer storage for private documents */
const documentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(env.UPLOAD_DIR, 'documents'));
  },
  filename: (_req, file, cb) => {
    cb(null, randomFilename(file.originalname));
  },
});

/** Filter: images only */
function imageFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (IMAGE_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError(`Invalid file type: ${file.mimetype}. Allowed: ${IMAGE_MIMES.join(', ')}`));
  }
}

/** Filter: documents (images + PDF) */
function documentFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (DOCUMENT_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError(`Invalid file type: ${file.mimetype}. Allowed: ${DOCUMENT_MIMES.join(', ')}`));
  }
}

/** Upload middleware for images (single file, field name 'image') */
export const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: env.MAX_IMAGE_SIZE_MB * 1024 * 1024 },
  fileFilter: imageFilter,
}).single('image');

/** Upload middleware for documents (single file, field name 'document') */
export const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: env.MAX_DOCUMENT_SIZE_MB * 1024 * 1024 },
  fileFilter: documentFilter,
}).single('document');

/** Upload middleware for multiple images (field name 'images', max 10) */
export const uploadImages = multer({
  storage: imageStorage,
  limits: { fileSize: env.MAX_IMAGE_SIZE_MB * 1024 * 1024 },
  fileFilter: imageFilter,
}).array('images', 10);

