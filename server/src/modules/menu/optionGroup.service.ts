import prisma from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';

export async function createOptionGroup(
  cafeId: string,
  itemId: string,
  data: {
    name: string;
    isRequired?: boolean;
    minSelect?: number;
    maxSelect?: number;
    sortOrder?: number;
    options?: { name: string; extraPricePaise?: number; isAvailable?: boolean; sortOrder?: number }[];
  },
) {
  const item = await prisma.item.findFirst({
    where: { id: itemId, cafeId, deletedAt: null },
  });
  if (!item) throw new NotFoundError('Item');

  return prisma.optionGroup.create({
    data: {
      cafeId,
      itemId,
      name: data.name,
      isRequired: data.isRequired ?? false,
      minSelect: data.minSelect ?? 0,
      maxSelect: data.maxSelect ?? 1,
      sortOrder: data.sortOrder ?? 0,
      options: data.options
        ? {
            create: data.options.map((opt, idx) => ({
              name: opt.name,
              extraPricePaise: opt.extraPricePaise ?? 0,
              isAvailable: opt.isAvailable ?? true,
              sortOrder: opt.sortOrder ?? idx,
            })),
          }
        : undefined,
    },
    include: { options: true },
  });
}

export async function updateOptionGroup(cafeId: string, groupId: string, data: any) {
  const group = await prisma.optionGroup.findFirst({
    where: { id: groupId, cafeId },
  });
  if (!group) throw new NotFoundError('Option group');

  return prisma.optionGroup.update({
    where: { id: groupId },
    data,
    include: { options: true },
  });
}

export async function deleteOptionGroup(cafeId: string, groupId: string) {
  const group = await prisma.optionGroup.findFirst({
    where: { id: groupId, cafeId },
  });
  if (!group) throw new NotFoundError('Option group');

  return prisma.optionGroup.delete({ where: { id: groupId } });
}

export async function addOptionToGroup(
  cafeId: string,
  groupId: string,
  data: { name: string; extraPricePaise?: number; isAvailable?: boolean; sortOrder?: number },
) {
  const group = await prisma.optionGroup.findFirst({
    where: { id: groupId, cafeId },
  });
  if (!group) throw new NotFoundError('Option group');

  return prisma.option.create({
    data: {
      groupId,
      name: data.name,
      extraPricePaise: data.extraPricePaise ?? 0,
      isAvailable: data.isAvailable ?? true,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}

export async function deleteOption(cafeId: string, optionId: string) {
  const option = await prisma.option.findFirst({
    where: { id: optionId, group: { cafeId } },
  });
  if (!option) throw new NotFoundError('Option');

  return prisma.option.delete({ where: { id: optionId } });
}

