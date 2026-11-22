import prisma from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';

export async function listCategories(cafeId: string, onlyActive: boolean = false) {
  return prisma.category.findMany({
    where: {
      cafeId,
      deletedAt: null,
      ...(onlyActive ? { isActive: true } : {}),
    },
    orderBy: { sortOrder: 'asc' },
    include: {
      items: {
        where: { deletedAt: null, ...(onlyActive ? { isAvailable: true } : {}) },
        orderBy: { sortOrder: 'asc' },
        include: {
          optionGroups: {
            orderBy: { sortOrder: 'asc' },
            include: {
              options: {
                where: { isAvailable: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
      },
    },
  });
}

export async function createCategory(cafeId: string, data: any) {
  const count = await prisma.category.count({ where: { cafeId } });
  return prisma.category.create({
    data: {
      cafeId,
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      sortOrder: data.sortOrder ?? count,
      isActive: data.isActive ?? true,
      scheduleStart: data.scheduleStart,
      scheduleEnd: data.scheduleEnd,
    },
  });
}

export async function updateCategory(cafeId: string, categoryId: string, data: any) {
  const cat = await prisma.category.findFirst({
    where: { id: categoryId, cafeId, deletedAt: null },
  });
  if (!cat) throw new NotFoundError('Category');

  return prisma.category.update({
    where: { id: categoryId },
    data,
  });
}

export async function deleteCategory(cafeId: string, categoryId: string) {
  const cat = await prisma.category.findFirst({
    where: { id: categoryId, cafeId, deletedAt: null },
  });
  if (!cat) throw new NotFoundError('Category');

  return prisma.category.update({
    where: { id: categoryId },
    data: { deletedAt: new Date() },
  });
}

export async function reorderCategories(cafeId: string, orderedIds: string[]) {
  const updates = orderedIds.map((id, index) =>
    prisma.category.updateMany({
      where: { id, cafeId },
      data: { sortOrder: index },
    }),
  );
  await prisma.$transaction(updates);
}

