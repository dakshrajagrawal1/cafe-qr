import type { Request, Response, NextFunction } from 'express';
import * as cafeService from './cafe.service.js';
import { ValidationError } from '../../lib/errors.js';

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const cafe = await cafeService.getCafeProfile(req.cafeId!);
    res.json({ data: cafe });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const cafe = await cafeService.updateCafeProfile(req.cafeId!, req.body, req);
    res.json({ message: 'Profile updated successfully', data: cafe });
  } catch (error) {
    next(error);
  }
}

export async function getSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await cafeService.getCafeSettings(req.cafeId!);
    res.json({ data: settings });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await cafeService.updateCafeSettings(req.cafeId!, req.body, req);
    res.json({ message: 'Settings updated successfully', data: settings });
  } catch (error) {
    next(error);
  }
}

export async function uploadDocument(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new ValidationError('No document file uploaded');
    }

    const { type, documentNumber, expiryDate } = req.body;
    if (!type) {
      throw new ValidationError('Document type is required');
    }

    const doc = await cafeService.uploadCafeDocument(
      req.cafeId!,
      req.file,
      {
        type,
        documentNumber,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
      req,
    );

    res.status(201).json({
      message: 'Document uploaded successfully. Awaiting verification.',
      data: doc,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const docs = await cafeService.listCafeDocuments(req.cafeId!);
    res.json({ data: docs });
  } catch (error) {
    next(error);
  }
}

