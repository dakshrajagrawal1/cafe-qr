import prisma from '../../lib/prisma.js';
import argon2 from 'argon2';
import { NotFoundError, ConflictError, ForbiddenError } from '../../lib/errors.js';
import { logAudit } from '../../lib/audit.js';
import type { Request } from 'express';

export async function listStaff(cafeId: string) {
  return prisma.user.findMany({
    where: {
      cafeId,
      deletedAt: null,
      role: { in: ['manager', 'chef', 'waiter'] },
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      permissions: true,
      waiterPin: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createStaff(
  cafeId: string,
  data: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    role: 'manager' | 'chef' | 'waiter';
    waiterPin?: string;
    permissions?: Record<string, boolean>;
  },
  req?: Request,
) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new ConflictError('A user with this email already exists');
  }

  // If user is a manager creating staff, they cannot create other managers
  if (req?.user?.role === 'manager' && data.role === 'manager') {
    throw new ForbiddenError('Managers cannot create other manager accounts');
  }

  const password = data.password || 'Staff@123';
  const passwordHash = await argon2.hash(password);

  const user = await prisma.user.create({
    data: {
      cafeId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash,
      role: data.role,
      waiterPin: data.waiterPin,
      permissions: data.permissions ?? {},
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      permissions: true,
      waiterPin: true,
      createdAt: true,
    },
  });

  await logAudit({
    cafeId,
    userId: req?.user?.id,
    action: 'staff.created',
    entityType: 'user',
    entityId: user.id,
    newValue: { name: user.name, role: user.role, email: user.email },
    req,
  });

  return user;
}

export async function updateStaff(
  cafeId: string,
  userId: string,
  data: {
    name?: string;
    phone?: string;
    isActive?: boolean;
    permissions?: Record<string, boolean>;
    waiterPin?: string;
    password?: string;
  },
  req?: Request,
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, cafeId, deletedAt: null },
  });
  if (!user) throw new NotFoundError('Staff user');

  if (user.role === 'owner' || user.role === 'super_admin') {
    throw new ForbiddenError('Cannot modify owner or admin account via staff management');
  }

  let passwordHash = undefined;
  if (data.password) {
    passwordHash = await argon2.hash(data.password);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      phone: data.phone,
      isActive: data.isActive,
      permissions: data.permissions,
      waiterPin: data.waiterPin,
      ...(passwordHash && { passwordHash }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      permissions: true,
      waiterPin: true,
    },
  });

  await logAudit({
    cafeId,
    userId: req?.user?.id,
    action: 'staff.updated',
    entityType: 'user',
    entityId: userId,
    oldValue: user,
    newValue: updated,
    req,
  });

  return updated;
}

export async function deleteStaff(cafeId: string, userId: string, req?: Request) {
  const user = await prisma.user.findFirst({
    where: { id: userId, cafeId, deletedAt: null },
  });
  if (!user) throw new NotFoundError('Staff user');

  if (user.role === 'owner') {
    throw new ForbiddenError('Cannot delete cafe owner');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), isActive: false },
  });

  await logAudit({
    cafeId,
    userId: req?.user?.id,
    action: 'staff.deleted',
    entityType: 'user',
    entityId: userId,
    req,
  });
}

