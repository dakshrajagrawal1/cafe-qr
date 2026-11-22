import prisma from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';

export async function listItems(cafeId: string, categoryId?: string) {
  return prisma.item.findMany({
    where: {
      cafeId,
      deletedAt: null,
      ...(categoryId ? { categoryId } : {}),
    },
    orderBy: { sortOrder: 'asc' },
    include: {
      category: { select: { id: true, name: true } },
      optionGroups: {
        orderBy: { sortOrder: 'asc' },
        include: {
          options: { orderBy: { sortOrder: 'asc' } },
        },
      },
    },
  });
}

export async function getItemById(cafeId: string, itemId: string) {
  const item = await prisma.item.findFirst({
    where: { id: itemId, cafeId, deletedAt: null },
    include: {
      category: true,
      optionGroups: {
        orderBy: { sortOrder: 'asc' },
        include: {
          options: { orderBy: { sortOrder: 'asc' } },
        },
      },
    },
  });

  if (!item) throw new NotFoundError('Item');
  return item;
}

export async function createItem(cafeId: string, data: any) {
  const count = await prisma.item.count({
    where: { cafeId, categoryId: data.categoryId },
  });

  return prisma.item.create({
    data: {
      cafeId,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      pricePaise: data.pricePaise,
      isVeg: data.isVeg ?? true,
      isAvailable: data.isAvailable ?? true,
      isSoldOut: data.isSoldOut ?? false,
      prepTimeMin: data.prepTimeMin,
      allergenInfo: data.allergenInfo,
      spicyLevel: data.spicyLevel ?? 0,
      sortOrder: data.sortOrder ?? count,
    },
    include: { category: true },
  });
}

export async function updateItem(cafeId: string, itemId: string, data: any) {
  const item = await prisma.item.findFirst({
    where: { id: itemId, cafeId, deletedAt: null },
  });
  if (!item) throw new NotFoundError('Item');

  return prisma.item.update({
    where: { id: itemId },
    data,
    include: { category: true },
  });
}

export async function deleteItem(cafeId: string, itemId: string) {
  const item = await prisma.item.findFirst({
    where: { id: itemId, cafeId, deletedAt: null },
  });
  if (!item) throw new NotFoundError('Item');

  return prisma.item.update({
    where: { id: itemId },
    data: { deletedAt: new Date() },
  });
}

export async function bulkUpdateAvailability(
  cafeId: string,
  itemIds: string[],
  updates: { isAvailable?: boolean; isSoldOut?: boolean },
) {
  return prisma.item.updateMany({
    where: {
      id: { in: itemIds },
      cafeId,
      deletedAt: null,
    },
    data: updates,
  });
}

