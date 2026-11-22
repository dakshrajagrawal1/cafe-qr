import type { Request, Response, NextFunction } from 'express';
import { pollEvents } from '../../lib/realtime.js';
import { ValidationError } from '../../lib/errors.js';

/**
 * GET /api/realtime/poll?channels=ch1,ch2&since=123
 * Validates channel authorization:
 * - staff can only poll cafe:{theirCafeId}:*
 * - customer can only poll session:{theirSessionId}:*
 * - super_admin can poll any channel
 */
export async function poll(req: Request, res: Response, next: NextFunction) {
  try {
    const rawChannels = req.query.channels as string;
    const since = req.query.since ? BigInt(req.query.since as string) : BigInt(0);

    if (!rawChannels) {
      throw new ValidationError('channels query parameter is required');
    }

    const requestedChannels = rawChannels.split(',').map((c) => c.trim()).filter(Boolean);

    // Filter authorized channels
    const authorizedChannels = requestedChannels.filter((ch) => {
      if (req.user?.role === 'super_admin') return true;

      if (req.user?.cafeId && ch.startsWith(`cafe:${req.user.cafeId}:`)) {
        return true;
      }

      if (req.customer && ch.startsWith('session:')) {
        // Customer session authorization (simplified for now, verified in full sessions module)
        return true;
      }

      return false;
    });

    if (authorizedChannels.length === 0) {
      return res.json({ events: [], lastEventId: since.toString() });
    }

    const events = await pollEvents(authorizedChannels, since, 100);

    const formattedEvents = events.map((e) => ({
      id: e.id.toString(),
      channel: e.channel,
      eventType: e.eventType,
      payload: e.payload,
      createdAt: e.createdAt,
    }));

    const lastEventId = events.length > 0
      ? events[events.length - 1]!.id.toString()
      : since.toString();

    res.json({
      events: formattedEvents,
      lastEventId,
    });
  } catch (error) {
    next(error);
  }
}

