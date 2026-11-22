import type { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../../lib/errors.js';
import { env } from '../../config/env.js';

export async function uploadSingleImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new ValidationError('No image file provided');
    }

    const publicUrl = `${env.API_BASE_URL}/uploads/images/${req.file.filename}`;
    res.status(201).json({
      message: 'Image uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: publicUrl,
      },
    });
  } catch (error) {
    next(error);
  }
}

