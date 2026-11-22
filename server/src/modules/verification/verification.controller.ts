import type { Request, Response, NextFunction } from 'express';
import * as verifyService from './verification.service.js';
import { ValidationError, NotFoundError } from '../../lib/errors.js';
import path from 'node:path';
import fs from 'node:fs';
import { env } from '../../config/env.js';
import prisma from '../../lib/prisma.js';

export async function listQueue(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await verifyService.listVerificationQueue({ page, limit });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const cafe = await verifyService.getCafeForVerification(req.params.cafeId as string);
    res.json({ data: cafe });
  } catch (error) {
    next(error);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await verifyService.approveCafe(req.params.cafeId as string, req.user!.id, req);
    res.json({ message: 'Cafe approved successfully', data: result });
  } catch (error) {
    next(error);
  }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body;
    if (!reason) {
      throw new ValidationError('Rejection reason is required');
    }

    const result = await verifyService.rejectCafe(
      req.params.cafeId as string,
      reason,
      req.user!.id,
      req,
    );
    res.json({ message: 'Cafe registration rejected', data: result });
  } catch (error) {
    next(error);
  }
}

export async function viewPrivateDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const doc = await prisma.cafeDocument.findUnique({
      where: { id: req.params.documentId as string },
    });

    if (!doc) throw new NotFoundError('Document');

    // Only super_admin or the owner of the document can view it
    if (req.user!.role !== 'super_admin' && req.user!.cafeId !== doc.cafeId) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    const fullPath = path.resolve(env.UPLOAD_DIR, 'documents', doc.filePath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('File not found on disk');
    }

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
    fs.createReadStream(fullPath).pipe(res);
  } catch (error) {
    next(error);
  }
}
