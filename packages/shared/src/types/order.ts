import type { OrderStatus, DishStatus } from '../constants/statuses.js';

export interface OrderItemSummary {
  id: string;
  orderId: string;
  itemId: string;
  itemNameSnapshot: string;
  itemPriceSnapshot: number;
  quantity: number;
  selectedOptionsSnapshot?: any;
  specialInstructions?: string | null;
  isVegSnapshot: boolean;
  status: DishStatus;
  cancelReason?: string | null;
  createdAt: string;
}

export interface OrderSummary {
  id: string;
  cafeId: string;
  sessionId: string;
  tableId: string;
  orderNumber: string;
  status: OrderStatus;
  rejectionReason?: string | null;
  items: OrderItemSummary[];
  createdAt: string;
}

