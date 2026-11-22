import type { Request, Response, NextFunction } from 'express';
import * as tableService from './tables.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const tables = await tableService.listTables(req.cafeId!);
    res.json({ data: tables });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const table = await tableService.createTable(req.cafeId!, req.body);
    res.status(201).json({ data: table });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const table = await tableService.updateTable(req.cafeId!, req.params.id as string, req.body);
    res.json({ data: table });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await tableService.deleteTable(req.cafeId!, req.params.id as string);
    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function getQR(req: Request, res: Response, next: NextFunction) {
  try {
    const details = await tableService.getTableQRDetails(req.cafeId!, req.params.id as string);
    res.json({ data: details });
  } catch (error) {
    next(error);
  }
}

export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.query.t as string;
    if (!token) {
      return res.status(400).json({ error: { message: 'Token parameter t is required' } });
    }
    const result = await tableService.verifyCustomerTableToken(token);
    if (!result.valid) {
      return res.status(400).json({ error: { message: result.error } });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
}


export async function getLiveGrid(req: Request, res: Response, next: NextFunction) {
  try {
    const grid = await tableService.getLiveTableGrid(req.cafeId!);
    res.json({ data: grid });
  } catch (error) {
    next(error);
  }
}

export async function forceCloseSession(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.params.sessionId as string;
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ error: { message: 'Reason for closing session is required' } });
    }

    const result = await tableService.forceCloseSession(
      req.cafeId!,
      sessionId,
      reason,
      req.user!.id,
      req,
    );

    res.json({ message: 'Table session closed successfully', data: result });
  } catch (error) {
    next(error);
  }
}
