import prisma from '../../lib/prisma.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../lib/errors.js';
import { logAudit } from '../../lib/audit.js';
import { publishEvent } from '../../lib/realtime.js';
import type { Request } from 'express';
import crypto from 'node:crypto';
import type { PlanFeature, Subscription, CafeStatus } from '@prisma/client';

export interface CalculatedSubscriptionStatus {
  effectiveStatus: 'trial' | 'active' | 'expiring' | 'grace' | 'expired' | 'suspended' | 'pending_verification';
  isOrderingAllowed: boolean;
  isGracePeriod: boolean;
  daysRemaining: number;
  graceDays: number;
  graceEndsAt: Date;
}

/**
 * Pure function: calculates the exact lifecycle status of a subscription
 * based on dates, grace period, and cafe status.
 */
export function calculateSubscriptionStatus(
  sub: { startsAt: Date; expiresAt: Date; graceDays: number; trialEndsAt?: Date | null; status: string },
  cafeStatus: CafeStatus,
  now: Date = new Date(),
): CalculatedSubscriptionStatus {
  if (cafeStatus === 'pending_verification') {
    return {
      effectiveStatus: 'pending_verification',
      isOrderingAllowed: false,
      isGracePeriod: false,
      daysRemaining: 0,
      graceDays: sub.graceDays,
      graceEndsAt: sub.expiresAt,
    };
  }

  if (cafeStatus === 'suspended' || sub.status === 'suspended') {
    return {
      effectiveStatus: 'suspended',
      isOrderingAllowed: false,
      isGracePeriod: false,
      daysRemaining: 0,
      graceDays: sub.graceDays,
      graceEndsAt: sub.expiresAt,
    };
  }

  const graceDays = sub.graceDays ?? 3;
  const graceEndsAt = new Date(sub.expiresAt.getTime() + graceDays * 24 * 60 * 60 * 1000);
  const msRemaining = sub.expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));

  // Case 1: Subscription is within regular validity (not expired)
  if (now <= sub.expiresAt) {
    if (sub.trialEndsAt && now <= sub.trialEndsAt) {
      return {
        effectiveStatus: 'trial',
        isOrderingAllowed: true,
        isGracePeriod: false,
        daysRemaining: Math.max(0, daysRemaining),
        graceDays,
        graceEndsAt,
      };
    }

    if (daysRemaining <= 7) {
      return {
        effectiveStatus: 'expiring',
        isOrderingAllowed: true,
        isGracePeriod: false,
        daysRemaining: Math.max(0, daysRemaining),
        graceDays,
        graceEndsAt,
      };
    }

    return {
      effectiveStatus: 'active',
      isOrderingAllowed: true,
      isGracePeriod: false,
      daysRemaining: Math.max(0, daysRemaining),
      graceDays,
      graceEndsAt,
    };
  }

  // Case 2: Past expiration date, but within grace period
  // Expiry rule: orders keep working normally during the grace period!
  if (now <= graceEndsAt) {
    return {
      effectiveStatus: 'grace',
      isOrderingAllowed: true,
      isGracePeriod: true,
      daysRemaining: 0,
      graceDays,
      graceEndsAt,
    };
  }

  // Case 3: Past grace period -> Expired!
  // Orders blocked, menu remains visible with "ordering unavailable"
  return {
    effectiveStatus: 'expired',
    isOrderingAllowed: false,
    isGracePeriod: false,
    daysRemaining: 0,
    graceDays,
    graceEndsAt,
  };
}

/**
 * Parses PlanFeature records into a typed feature map with sensible defaults.
 */
export function parsePlanFeatures(features: PlanFeature[]) {
  const map: Record<string, any> = {
    max_tables: 10,
    max_menu_items: 50,
    max_staff: 3,
    kitchen_screen: false,
    waiter_screen: false,
    online_payments: true,
    shared_cart: false,
    analytics_level: 'basic',
    offers_coupons: false,
    remove_branding: false,
    order_history_days: 30,
  };

  for (const f of features) {
    if (f.featureValue === 'true') {
      map[f.featureKey] = true;
    } else if (f.featureValue === 'false') {
      map[f.featureKey] = false;
    } else if (!isNaN(Number(f.featureValue))) {
      map[f.featureKey] = Number(f.featureValue);
    } else {
      map[f.featureKey] = f.featureValue;
    }
  }

  return map;
}

/**
 * Get active subscription details for a cafe.
 */
export async function getCafeSubscriptionDetails(cafeId: string) {
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    select: { id: true, name: true, status: true },
  });

  if (!cafe) throw new NotFoundError('Cafe');

  const subscription = await prisma.subscription.findFirst({
    where: { cafeId },
    orderBy: { createdAt: 'desc' },
    include: {
      plan: {
        include: { features: true },
      },
    },
  });

  if (!subscription) {
    throw new NotFoundError('Subscription');
  }

  const calculated = calculateSubscriptionStatus(subscription, cafe.status);
  const features = parsePlanFeatures(subscription.plan.features);

  return {
    id: subscription.id,
    cafeId: subscription.cafeId,
    planId: subscription.planId,
    planName: subscription.plan.name,
    planPricePaise: subscription.customPricePaise ?? subscription.plan.pricePaise,
    status: subscription.status,
    effectiveStatus: calculated.effectiveStatus,
    isOrderingAllowed: calculated.isOrderingAllowed,
    isGracePeriod: calculated.isGracePeriod,
    daysRemaining: calculated.daysRemaining,
    startsAt: subscription.startsAt.toISOString(),
    expiresAt: subscription.expiresAt.toISOString(),
    graceDays: calculated.graceDays,
    graceEndsAt: calculated.graceEndsAt.toISOString(),
    customPricePaise: subscription.customPricePaise,
    features,
  };
}

/**
 * List all available plans for cafe owners to upgrade/subscribe.
 */
export async function listActivePlans() {
  const plans = await prisma.plan.findMany({
    where: { isActive: true, isArchived: false },
    orderBy: { sortOrder: 'asc' },
    include: { features: true },
  });

  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    pricePaise: p.pricePaise,
    billingPeriod: p.billingPeriod,
    billingDays: p.billingDays,
    trialDays: p.trialDays,
    sortOrder: p.sortOrder,
    features: parsePlanFeatures(p.features),
  }));
}

/**
 * Super Admin action: extend subscription days for a cafe.
 */
export async function extendSubscriptionDays(
  subscriptionId: string,
  days: number,
  reason: string,
  adminId: string,
  req?: Request,
) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { cafe: true, plan: true },
  });

  if (!sub) throw new NotFoundError('Subscription');

  const now = new Date();
  // If subscription has already passed expiry, extend from now; otherwise extend from existing expiry
  const baseDate = sub.expiresAt < now ? now : sub.expiresAt;
  const newExpiresAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      expiresAt: newExpiresAt,
      status: 'active',
    },
  });

  await logAudit({
    cafeId: sub.cafeId,
    userId: adminId,
    action: 'subscription.extended',
    entityType: 'subscription',
    entityId: sub.id,
    oldValue: { expiresAt: sub.expiresAt, status: sub.status },
    newValue: { expiresAt: newExpiresAt, addedDays: days, reason },
    req,
  });

  await publishEvent(`cafe:${sub.cafeId}:subscription`, 'subscription.renewed', {
    newExpiresAt: newExpiresAt.toISOString(),
    planName: sub.plan.name,
    reason,
  });

  return updated;
}

/**
 * Super Admin action: change plan of a cafe subscription.
 * Converts leftover days using: (remainingDays / oldBillingDays) * (oldPrice / newPrice) * newBillingDays
 */
export async function changeSubscriptionPlan(
  subscriptionId: string,
  newPlanId: string,
  convertLeftoverDays: boolean,
  customPricePaise: number | null | undefined,
  reason: string,
  adminId: string,
  req?: Request,
) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });

  if (!sub) throw new NotFoundError('Subscription');

  const newPlan = await prisma.plan.findUnique({ where: { id: newPlanId } });
  if (!newPlan) throw new NotFoundError('New plan');

  const now = new Date();
  let newExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // default 30 days

  if (convertLeftoverDays && sub.expiresAt > now) {
    const remainingMs = sub.expiresAt.getTime() - now.getTime();
    const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    // Prorate: leftover monetary value = remainingDays * (oldPrice / 30)
    const oldPrice = sub.customPricePaise ?? sub.plan.pricePaise;
    const newPrice = customPricePaise ?? newPlan.pricePaise;

    if (newPrice > 0 && oldPrice > 0) {
      const leftoverValue = (remainingDays * oldPrice) / 30;
      const convertedDays = Math.max(1, Math.round((leftoverValue / newPrice) * 30));
      newExpiresAt = new Date(now.getTime() + convertedDays * 24 * 60 * 60 * 1000);
    } else {
      newExpiresAt = new Date(now.getTime() + remainingDays * 24 * 60 * 60 * 1000);
    }
  }

  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      planId: newPlanId,
      expiresAt: newExpiresAt,
      startsAt: now,
      status: 'active',
      customPricePaise: customPricePaise ?? null,
    },
    include: { plan: true },
  });

  await logAudit({
    cafeId: sub.cafeId,
    userId: adminId,
    action: 'subscription.plan_changed',
    entityType: 'subscription',
    entityId: sub.id,
    oldValue: { planId: sub.planId, expiresAt: sub.expiresAt },
    newValue: { newPlanId, newExpiresAt, reason, customPricePaise },
    req,
  });

  await publishEvent(`cafe:${sub.cafeId}:subscription`, 'subscription.plan_changed', {
    oldPlan: sub.plan.name,
    newPlan: newPlan.name,
    expiresAt: newExpiresAt.toISOString(),
  });

  return updated;
}

/**
 * Super Admin action: record an offline payment (cash/bank/UPI) and extend subscription.
 */
export async function recordOfflinePayment(
  subscriptionId: string,
  input: {
    amountPaise: number;
    mode: 'cash' | 'upi' | 'bank';
    extendDays: number;
    notes?: string;
  },
  adminId: string,
  req?: Request,
) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });

  if (!sub) throw new NotFoundError('Subscription');

  const now = new Date();
  const invoiceNumber = `INV-${now.getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const baseDate = sub.expiresAt < now ? now : sub.expiresAt;
  const newExpiresAt = new Date(baseDate.getTime() + input.extendDays * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create payment record
    const payment = await tx.subscriptionPayment.create({
      data: {
        subscriptionId: sub.id,
        cafeId: sub.cafeId,
        amountPaise: input.amountPaise,
        mode: input.mode,
        invoiceNumber,
        notes: input.notes,
        status: 'completed',
        paidAt: now,
        recordedBy: adminId,
      },
    });

    // 2. Extend subscription
    const updatedSub = await tx.subscription.update({
      where: { id: sub.id },
      data: {
        expiresAt: newExpiresAt,
        status: 'active',
      },
    });

    return { payment, subscription: updatedSub };
  });

  await logAudit({
    cafeId: sub.cafeId,
    userId: adminId,
    action: 'subscription.offline_payment_recorded',
    entityType: 'subscription_payment',
    entityId: result.payment.id,
    newValue: {
      amountPaise: input.amountPaise,
      mode: input.mode,
      invoiceNumber,
      extendedDays: input.extendDays,
      newExpiresAt,
    },
    req,
  });

  return result;
}

/**
 * List payment history for a cafe's subscription.
 */
export async function listCafePayments(cafeId: string) {
  return prisma.subscriptionPayment.findMany({
    where: { cafeId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Handle incoming Razorpay Webhook for subscription renewal.
 */
export async function processRazorpayWebhook(
  payload: any,
  signature: string,
  webhookSecret: string,
) {
  // 1. Verify webhook signature
  const isValid = verifyWebhookSignature(payload, signature, webhookSecret);
  if (!isValid) {
    throw new ValidationError('Invalid webhook signature');
  }

  // 2. Handle payment.captured / order.paid
  const event = payload.event;
  if (event === 'payment.captured' || event === 'order.paid') {
    const paymentEntity = payload.payload?.payment?.entity;
    if (!paymentEntity) return { received: true };

    const paymentId = paymentEntity.id;
    const orderId = paymentEntity.order_id;
    const amount = paymentEntity.amount; // already in paise
    const notes = paymentEntity.notes || {};
    const subscriptionId = notes.subscription_id;
    const cafeId = notes.cafe_id;

    if (!subscriptionId) return { received: true, note: 'No subscription_id in notes' };

    // Idempotency check: don't process same payment twice
    const existing = await prisma.subscriptionPayment.findFirst({
      where: { gatewayRef: paymentId },
    });
    if (existing) {
      return { received: true, alreadyProcessed: true };
    }

    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });
    if (!sub) return { received: true, error: 'Subscription not found' };

    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const baseDate = sub.expiresAt < now ? now : sub.expiresAt;
    // Default extend by 30 days for monthly
    const daysToAdd = sub.plan.billingDays || (sub.plan.billingPeriod === 'yearly' ? 365 : 30);
    const newExpiresAt = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.subscriptionPayment.create({
        data: {
          subscriptionId: sub.id,
          cafeId: sub.cafeId,
          amountPaise: amount,
          mode: 'online',
          gatewayRef: paymentId,
          gatewayOrderId: orderId,
          gatewaySignature: signature,
          invoiceNumber,
          status: 'completed',
          paidAt: now,
        },
      }),
      prisma.subscription.update({
        where: { id: sub.id },
        data: {
          expiresAt: newExpiresAt,
          status: 'active',
        },
      }),
    ]);

    await publishEvent(`cafe:${sub.cafeId}:subscription`, 'subscription.renewed', {
      newExpiresAt: newExpiresAt.toISOString(),
      amount,
      invoiceNumber,
    });
  }

  return { received: true };
}
import { verifyWebhookSignature } from './webhook.util.js';
export { verifyWebhookSignature };
