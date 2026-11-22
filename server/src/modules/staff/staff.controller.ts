import type { Request, Response, NextFunction } from 'express';
import * as staffService from './staff.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const staff = await staffService.listStaff(req.cafeId!);
    res.json({ data: staff });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const staff = await staffService.createStaff(req.cafeId!, req.body, req);
    res.status(201).json({ message: 'Staff created successfully', data: staff });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const staff = await staffService.updateStaff(req.cafeId!, req.params.id as string, req.body, req);
    res.json({ message: 'Staff updated successfully', data: staff });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await staffService.deleteStaff(req.cafeId!, req.params.id as string, req);
    res.json({ message: 'Staff member removed' });
  } catch (error) {
    next(error);
  }
}
