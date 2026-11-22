import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Platform Settings
  await prisma.platformSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      defaultTrialDays: 14,
      defaultGraceDays: 3,
      platformName: 'CafeQR',
      otpProvider: 'console',
    },
  });

  // 2. Super Admin User
  const adminPasswordHash = await argon2.hash('Admin@12345');
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@cafeqr.com' },
    update: {},
    create: {
      email: 'admin@cafeqr.com',
      name: 'Platform Super Admin',
      passwordHash: adminPasswordHash,
      role: 'super_admin',
      isActive: true,
    },
  });
  console.log(`✅ Super Admin created: ${superAdmin.email} (Password: Admin@12345)`);

  // 3. Platform Subscription Plans
  const basicPlan = await prisma.plan.upsert({
    where: { id: 'plan-basic' },
    update: {},
    create: {
      id: 'plan-basic',
      name: 'Basic Starter',
      pricePaise: 99900, // ₹999/month
      billingPeriod: 'monthly',
      trialDays: 14,
      sortOrder: 1,
      features: {
        create: [
          { featureKey: 'max_tables', featureValue: '10' },
          { featureKey: 'max_menu_items', featureValue: '50' },
          { featureKey: 'max_staff', featureValue: '3' },
          { featureKey: 'kitchen_screen', featureValue: 'false' },
          { featureKey: 'waiter_screen', featureValue: 'false' },
          { featureKey: 'online_payments', featureValue: 'true' },
          { featureKey: 'shared_cart', featureValue: 'false' },
          { featureKey: 'analytics_level', featureValue: 'basic' },
          { featureKey: 'offers_coupons', featureValue: 'false' },
          { featureKey: 'remove_branding', featureValue: 'false' },
          { featureKey: 'order_history_days', featureValue: '30' },
        ],
      },
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { id: 'plan-pro' },
    update: {},
    create: {
      id: 'plan-pro',
      name: 'Pro Cafe',
      pricePaise: 199900, // ₹1,999/month
      billingPeriod: 'monthly',
      trialDays: 14,
      sortOrder: 2,
      features: {
        create: [
          { featureKey: 'max_tables', featureValue: '30' },
          { featureKey: 'max_menu_items', featureValue: '200' },
          { featureKey: 'max_staff', featureValue: '10' },
          { featureKey: 'kitchen_screen', featureValue: 'true' },
          { featureKey: 'waiter_screen', featureValue: 'true' },
          { featureKey: 'online_payments', featureValue: 'true' },
          { featureKey: 'shared_cart', featureValue: 'true' },
          { featureKey: 'analytics_level', featureValue: 'advanced' },
          { featureKey: 'offers_coupons', featureValue: 'true' },
          { featureKey: 'remove_branding', featureValue: 'false' },
          { featureKey: 'order_history_days', featureValue: '90' },
        ],
      },
    },
  });

  const enterprisePlan = await prisma.plan.upsert({
    where: { id: 'plan-enterprise' },
    update: {},
    create: {
      id: 'plan-enterprise',
      name: 'Enterprise / Multi-Outlet',
      pricePaise: 1999900, // ₹19,999/year
      billingPeriod: 'yearly',
      trialDays: 30,
      sortOrder: 3,
      features: {
        create: [
          { featureKey: 'max_tables', featureValue: '100' },
          { featureKey: 'max_menu_items', featureValue: '1000' },
          { featureKey: 'max_staff', featureValue: '50' },
          { featureKey: 'kitchen_screen', featureValue: 'true' },
          { featureKey: 'waiter_screen', featureValue: 'true' },
          { featureKey: 'online_payments', featureValue: 'true' },
          { featureKey: 'shared_cart', featureValue: 'true' },
          { featureKey: 'analytics_level', featureValue: 'full' },
          { featureKey: 'offers_coupons', featureValue: 'true' },
          { featureKey: 'remove_branding', featureValue: 'true' },
          { featureKey: 'order_history_days', featureValue: '365' },
        ],
      },
    },
  });
  console.log('✅ Subscription plans seeded (Basic, Pro, Enterprise)');

  // 4. Demo Cafe: "Chai & Bites"
  const demoOwnerPassword = await argon2.hash('Owner@12345');
  const demoManagerPassword = await argon2.hash('Manager@12345');
  const demoChefPassword = await argon2.hash('Chef@12345');
  const demoWaiterPassword = await argon2.hash('Waiter@12345');

  const demoCafe = await prisma.cafe.upsert({
    where: { slug: 'chai-bites' },
    update: {},
    create: {
      id: 'cafe-demo-1',
      name: 'Chai & Bites',
      slug: 'chai-bites',
      ownerName: 'Vikram Sharma',
      email: 'vikram@chaibites.com',
      phone: '+919876543210',
      address: 'Shop 14, Galleria Market, DLF Phase 4',
      city: 'Gurugram',
      currency: 'INR',
      status: 'approved',
      fssaiNumber: '10019011000123',
      settings: {
        create: {
          kitchenMode: true,
          allowPayAtEnd: true,
          useManagerLogin: true,
          gstEnabled: true,
          gstRate: 500, // 5%
          serviceChargeEnabled: false,
          serviceChargeRate: 0,
          defaultPrepTimeMin: 12,
        },
      },
      users: {
        create: [
          {
            email: 'vikram@chaibites.com',
            name: 'Vikram Sharma (Owner)',
            passwordHash: demoOwnerPassword,
            role: 'owner',
            phone: '+919876543210',
          },
          {
            email: 'manager@chaibites.com',
            name: 'Pooja Verma (Manager)',
            passwordHash: demoManagerPassword,
            role: 'manager',
            phone: '+919876543211',
            permissions: {
              can_edit_menu: true,
              can_manage_tables: true,
              can_manage_offers: true,
              can_see_daily_total: true,
              can_issue_refunds: true,
              can_manage_staff: true,
              can_view_reports: true,
              can_manage_settings: false,
            },
          },
          {
            email: 'kitchen@chaibites.com',
            name: 'Kitchen Staff',
            passwordHash: demoChefPassword,
            role: 'chef',
          },
          {
            email: 'waiter1@chaibites.com',
            name: 'Ramesh (Waiter)',
            passwordHash: demoWaiterPassword,
            role: 'waiter',
            waiterPin: '1234',
          },
        ],
      },
    },
  });
  console.log(`✅ Demo Cafe seeded: ${demoCafe.name} (/c/${demoCafe.slug})`);

  // 5. Subscription for Demo Cafe
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  await prisma.subscription.upsert({
    where: { id: 'sub-demo-1' },
    update: {},
    create: {
      id: 'sub-demo-1',
      cafeId: demoCafe.id,
      planId: proPlan.id,
      status: 'active',
      startsAt: now,
      expiresAt: expiresAt,
      graceDays: 3,
    },
  });

  // 6. 6 Tables with QR secrets
  for (let i = 1; i <= 6; i++) {
    const tableNumber = `T${i}`;
    const qrSecret = crypto.randomBytes(32).toString('hex');
    await prisma.table.upsert({
      where: {
        cafeId_tableNumber: {
          cafeId: demoCafe.id,
          tableNumber,
        },
      },
      update: {},
      create: {
        cafeId: demoCafe.id,
        tableNumber,
        label: `Table ${i}`,
        capacity: i <= 2 ? 2 : i <= 4 ? 4 : 6,
        sortOrder: i,
        qrSecret,
      },
    });
  }
  console.log('✅ 6 Tables created for Chai & Bites (T1 - T6)');

  // 7. Categories & Menu Items
  const catBeverages = await prisma.category.create({
    data: {
      cafeId: demoCafe.id,
      name: 'Hot Beverages',
      description: 'Handcrafted tea, artisanal filter coffee and warm infusions',
      sortOrder: 1,
      isActive: true,
      items: {
        create: [
          {
            cafeId: demoCafe.id,
            name: 'Kullad Masala Chai',
            description: 'Brewed with crushed ginger, green cardamom, cinnamon & fresh mint',
            pricePaise: 4000, // ₹40
            isVeg: true,
            isAvailable: true,
            prepTimeMin: 5,
            sortOrder: 1,
            optionGroups: {
              create: [
                {
                  cafeId: demoCafe.id,
                  name: 'Cup Size',
                  isRequired: true,
                  minSelect: 1,
                  maxSelect: 1,
                  sortOrder: 1,
                  options: {
                    create: [
                      { name: 'Regular (150ml)', extraPricePaise: 0, sortOrder: 1 },
                      { name: 'Large Kullad (250ml)', extraPricePaise: 2000, sortOrder: 2 },
                    ],
                  },
                },
                {
                  cafeId: demoCafe.id,
                  name: 'Sugar Level',
                  isRequired: false,
                  minSelect: 0,
                  maxSelect: 1,
                  sortOrder: 2,
                  options: {
                    create: [
                      { name: 'Less Sugar', extraPricePaise: 0, sortOrder: 1 },
                      { name: 'No Sugar / Jaggery', extraPricePaise: 1000, sortOrder: 2 },
                    ],
                  },
                },
              ],
            },
          },
          {
            cafeId: demoCafe.id,
            name: 'South Indian Filter Coffee',
            description: 'Traditional chicory blend decoction with frothy hot milk',
            pricePaise: 6000, // ₹60
            isVeg: true,
            isAvailable: true,
            prepTimeMin: 7,
            sortOrder: 2,
          },
        ],
      },
    },
  });

  const catMaggi = await prisma.category.create({
    data: {
      cafeId: demoCafe.id,
      name: 'Maggi & Noodles',
      description: 'Hot comfort bowls prepared with custom masala blends',
      sortOrder: 2,
      isActive: true,
      items: {
        create: [
          {
            cafeId: demoCafe.id,
            name: 'Classic Masala Maggi',
            description: 'Double noodles with authentic tastemaker and butter drizzle',
            pricePaise: 7000, // ₹70
            isVeg: true,
            isAvailable: true,
            prepTimeMin: 8,
            sortOrder: 1,
          },
          {
            cafeId: demoCafe.id,
            name: 'Cheese Corn Peri-Peri Maggi',
            description: 'Tossed with sweet corn kernels, peri peri dust and melting mozzarella',
            pricePaise: 12000, // ₹120
            isVeg: true,
            isAvailable: true,
            prepTimeMin: 10,
            sortOrder: 2,
            optionGroups: {
              create: [
                {
                  cafeId: demoCafe.id,
                  name: 'Add-ons',
                  isRequired: false,
                  minSelect: 0,
                  maxSelect: 3,
                  options: {
                    create: [
                      { name: 'Extra Cheese Slice', extraPricePaise: 2500, sortOrder: 1 },
                      { name: 'Sautéed Mushrooms', extraPricePaise: 3000, sortOrder: 2 },
                      { name: 'Spicy Green Chillies', extraPricePaise: 500, sortOrder: 3 },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  const catSnacks = await prisma.category.create({
    data: {
      cafeId: demoCafe.id,
      name: 'Snacks & Quick Bites',
      description: 'Crisp hot savouries made fresh to order',
      sortOrder: 3,
      isActive: true,
      items: {
        create: [
          {
            cafeId: demoCafe.id,
            name: 'Bun Maska',
            description: 'Warm soft pav bun generously slathered with Amul salted butter',
            pricePaise: 5000, // ₹50
            isVeg: true,
            isAvailable: true,
            prepTimeMin: 4,
            sortOrder: 1,
          },
          {
            cafeId: demoCafe.id,
            name: 'Crispy Veg Samosa (2 pcs)',
            description: 'Served with sweet tamarind saunth and spicy coriander mint chutney',
            pricePaise: 4000, // ₹40
            isVeg: true,
            isAvailable: true,
            prepTimeMin: 5,
            sortOrder: 2,
          },
        ],
      },
    },
  });

  console.log('✅ Menu categories and sample items seeded');
  console.log('\n🎉 Seed finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

