// ============================================================
// Realtime Event Publishing Helper
// ============================================================

import prisma from './prisma.js';

/**
 * Publish an event to a channel (stored in the realtime_events table).
 * Clients poll for events newer than their lastEventId.
 */
export async function publishEvent(
  channel: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.realtimeEvent.create({
      data: {
        channel,
        eventType,
        payload: payload as any,
      },
    });
  } catch (error) {
    console.error(`[REALTIME] Failed to publish event ${eventType} to ${channel}:`, error);
  }
}

/**
 * Poll for events from multiple channels since a given event ID.
 */
export async function pollEvents(
  channels: string[],
  sinceId: bigint,
  limit: number = 100,
) {
  return prisma.realtimeEvent.findMany({
    where: {
      channel: { in: channels },
      id: { gt: sinceId },
    },
    orderBy: { id: 'asc' },
    take: limit,
  });
}

/**
 * Remove events older than the specified number of hours.
 * Called by the cleanup cron job.
 */
export async function cleanupEvents(olderThanHours: number = 24): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  const result = await prisma.realtimeEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}

