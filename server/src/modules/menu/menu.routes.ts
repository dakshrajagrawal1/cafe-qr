import { Router } from 'express';
import * as catService from './category.service.js';
import * as itemService from './item.service.js';
import * as optService from './optionGroup.service.js';
import {
  requireAuth,
  requireRole,
  requirePermission,
  injectCafeId,
  requireCafeContext,
  validate,
} from '../../middleware/index.js';
import {
  createCategorySchema,
  updateCategorySchema,
  createItemSchema,
  updateItemSchema,
  bulkAvailabilitySchema,
  createOptionGroupSchema,
  createOptionSchema,
} from '@cafe-qr/shared';
import { z } from 'zod';

const router = Router();

// ==================== PUBLIC MENU ACCESS ====================
// Used by customer app: GET /api/menu/public/:slug
router.get('/public/:slug', async (req, res, next) => {
  try {
    const prisma = (await import('../../lib/prisma.js')).default;
    const cafe = await prisma.cafe.findUnique({
      where: { slug: req.params.slug as string },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        coverUrl: true,
        currency: true,
        status: true,
        fssaiNumber: true,
        settings: true,
      },
    });

    if (!cafe) {
      return res.status(404).json({ error: { message: 'Cafe not found' } });
    }

    if (cafe.status !== 'approved') {
      return res.json({
        data: {
          cafe,
          isComingSoon: true,
          categories: [],
        },
      });
    }

    const categories = await catService.listCategories(cafe.id, true);
    res.json({
      data: {
        cafe,
        isComingSoon: false,
        categories,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==================== STAFF PROTECTED ROUTES ====================
router.use(requireAuth);
router.use(injectCafeId);
router.use(requireCafeContext);
router.use(requireRole('owner', 'manager'));

// ---- Categories ----
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await catService.listCategories(req.cafeId!);
    res.json({ data: categories });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/categories',
  requirePermission('can_edit_menu'),
  validate({ body: createCategorySchema }),
  async (req, res, next) => {
    try {
      const category = await catService.createCategory(req.cafeId!, req.body);
      res.status(201).json({ data: category });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  '/categories/:id',
  requirePermission('can_edit_menu'),
  validate({ body: updateCategorySchema }),
  async (req, res, next) => {
    try {
      const category = await catService.updateCategory(req.cafeId!, req.params.id as string, req.body);
      res.json({ data: category });
    } catch (error) {
      next(error);
    }
  },
);

router.delete('/categories/:id', requirePermission('can_edit_menu'), async (req, res, next) => {
  try {
    await catService.deleteCategory(req.cafeId!, req.params.id as string);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/categories/reorder',
  requirePermission('can_edit_menu'),
  validate({ body: z.object({ orderedIds: z.array(z.string()) }) }),
  async (req, res, next) => {
    try {
      await catService.reorderCategories(req.cafeId!, req.body.orderedIds);
      res.json({ message: 'Categories reordered' });
    } catch (error) {
      next(error);
    }
  },
);

// ---- Items ----
router.get('/items', async (req, res, next) => {
  try {
    const items = await itemService.listItems(req.cafeId!, req.query.categoryId as string);
    res.json({ data: items });
  } catch (error) {
    next(error);
  }
});

router.get('/items/:id', async (req, res, next) => {
  try {
    const item = await itemService.getItemById(req.cafeId!, req.params.id as string);
    res.json({ data: item });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/items',
  requirePermission('can_edit_menu'),
  validate({ body: createItemSchema }),
  async (req, res, next) => {
    try {
      const item = await itemService.createItem(req.cafeId!, req.body);
      res.status(201).json({ data: item });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  '/items/:id',
  requirePermission('can_edit_menu'),
  validate({ body: updateItemSchema }),
  async (req, res, next) => {
    try {
      const item = await itemService.updateItem(req.cafeId!, req.params.id as string, req.body);
      res.json({ data: item });
    } catch (error) {
      next(error);
    }
  },
);

router.delete('/items/:id', requirePermission('can_edit_menu'), async (req, res, next) => {
  try {
    await itemService.deleteItem(req.cafeId!, req.params.id as string);
    res.json({ message: 'Item deleted' });
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/items/bulk-availability',
  requirePermission('can_edit_menu'),
  validate({ body: bulkAvailabilitySchema }),
  async (req, res, next) => {
    try {
      await itemService.bulkUpdateAvailability(req.cafeId!, req.body.itemIds, {
        isAvailable: req.body.isAvailable,
        isSoldOut: req.body.isSoldOut,
      });
      res.json({ message: 'Items updated successfully' });
    } catch (error) {
      next(error);
    }
  },
);

// ---- Option Groups ----
router.post(
  '/items/:itemId/option-groups',
  requirePermission('can_edit_menu'),
  validate({ body: createOptionGroupSchema }),
  async (req, res, next) => {
    try {
      const group = await optService.createOptionGroup(
        req.cafeId!,
        req.params.itemId as string,
        req.body,
      );
      res.status(201).json({ data: group });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/option-groups/:groupId',
  requirePermission('can_edit_menu'),
  async (req, res, next) => {
    try {
      await optService.deleteOptionGroup(req.cafeId!, req.params.groupId as string);
      res.json({ message: 'Option group deleted' });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/option-groups/:groupId/options',
  requirePermission('can_edit_menu'),
  validate({ body: createOptionSchema }),
  async (req, res, next) => {
    try {
      const opt = await optService.addOptionToGroup(
        req.cafeId!,
        req.params.groupId as string,
        req.body,
      );
      res.status(201).json({ data: opt });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/options/:optionId',
  requirePermission('can_edit_menu'),
  async (req, res, next) => {
    try {
      await optService.deleteOption(req.cafeId!, req.params.optionId as string);
      res.json({ message: 'Option deleted' });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
