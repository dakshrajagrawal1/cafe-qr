const API_BASE = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : 'https://cafe-qr-api.onrender.com') + '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('tableqr_staff_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers as any),
    },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Request failed');
  }
  return json;
}

export const staffApi = {
  // Auth
  login: (data: { email: string; password: string }) =>
    request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Orders
  listOrders: (filters: { status?: string; sessionId?: string; today?: boolean }) => {
    const q = new URLSearchParams();
    if (filters.status) q.append('status', filters.status);
    if (filters.sessionId) q.append('sessionId', filters.sessionId);
    if (filters.today) q.append('today', 'true');
    return request<any>(`/orders?${q.toString()}`);
  },

  approveOrder: (orderId: string, itemDecisions?: any[]) =>
    request<any>(`/orders/${orderId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ itemDecisions }),
    }),

  rejectOrder: (orderId: string, reason: string) =>
    request<any>(`/orders/${orderId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  addDishToSession: (
    sessionId: string,
    data: {
      itemId: string;
      quantity: number;
      selectedOptions?: any[];
      specialInstructions?: string;
    },
  ) =>
    request<any>(`/orders/sessions/${sessionId}/add-dish`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Live Table Grid
  getLiveGrid: () => request<any>('/tables/live'),

  forceCloseSession: (sessionId: string, reason: string) =>
    request<any>(`/tables/sessions/${sessionId}/force-close`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Kitchen Screen
  getKitchenTickets: () => request<any>('/kitchen/tickets'),

  updateKitchenTicketStatus: (ticketId: string, status: 'preparing' | 'ready') =>
    request<any>(`/kitchen/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  undoKitchenTicketStatus: (ticketId: string, reason: string) =>
    request<any>(`/kitchen/tickets/${ticketId}/undo`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Waiter Screen
  getWaiterTables: () => request<any>('/waiter/tables'),

  getWaiterTableDishes: (tableId: string) => request<any>(`/waiter/tables/${tableId}/dishes`),

  markDishServed: (dishId: string) =>
    request<any>(`/waiter/dishes/${dishId}/serve`, {
      method: 'PATCH',
    }),

  undoDishServed: (dishId: string, reason: string) =>
    request<any>(`/waiter/dishes/${dishId}/undo-serve`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getWaiterCalls: () => request<any>('/waiter/calls'),

  acknowledgeWaiterCall: (callId: string) =>
    request<any>(`/waiter/calls/${callId}/acknowledge`, {
      method: 'PATCH',
    }),

  resolveWaiterCall: (callId: string) =>
    request<any>(`/waiter/calls/${callId}/resolve`, {
      method: 'PATCH',
    }),

  waiterCreateOrder: (data: {
    tableId: string;
    items: {
      itemId: string;
      quantity: number;
      selectedOptions?: any[];
      specialInstructions?: string;
    }[];
  }) =>
    request<any>('/waiter/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Menu items list (for adding dishes tableside or to session)
  getMenuItems: () => request<any>('/menu/items'),

  // Cafe Settings (including kitchenMode toggle)
  getSettings: () => request<any>('/cafe/settings'),
  updateSettings: (data: any) =>
    request<any>('/cafe/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Billing & Settlement
  getBillPreview: (sessionId: string) => request<any>(`/billing/sessions/${sessionId}/preview`),

  createBill: (sessionId: string, data?: { discountPaise?: number; notes?: string }) =>
    request<any>(`/billing/sessions/${sessionId}/bill`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  settleBill: (billId: string, data: {
    mode: 'cash' | 'online' | 'upi_counter' | 'split';
    cashReceivedPaise?: number;
    cashAmountPaise?: number;
    onlineAmountPaise?: number;
    gatewayRef?: string;
    notes?: string;
  }) =>
    request<any>(`/billing/bills/${billId}/settle`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Business Day
  getCurrentBusinessDay: () => request<any>('/business-day/current'),

  startBusinessDay: (data: { openingCashPaise?: number; notes?: string }) =>
    request<any>('/business-day/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  endBusinessDay: (data: {
    countedCashPaise?: number;
    notes?: string;
    forceOverride?: boolean;
    overrideReason?: string;
  }) =>
    request<any>('/business-day/end', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Analytics (Owner only)
  getAnalytics: (range: 'today' | 'week' | 'month' = 'today') =>
    request<any>(`/analytics/overview?range=${range}`),

  // Offers & Promotions
  getOffers: (promotionsOnly: boolean = false) =>
    request<any>(`/offers${promotionsOnly ? '?promotions=true' : ''}`),

  createOffer: (data: any) =>
    request<any>('/offers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateOffer: (offerId: string, data: any) =>
    request<any>(`/offers/${offerId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteOffer: (offerId: string) =>
    request<any>(`/offers/${offerId}`, {
      method: 'DELETE',
    }),

  // Admin / Platform Owner Fixed QR & Cafe Management
  getPlatformCafes: (params?: { page?: number; limit?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.search) q.append('search', params.search);
    return request<any>(`/admin/cafes?${q.toString()}`);
  },

  getCafeDetail: (cafeId: string) => request<any>(`/admin/cafes/${cafeId}`),

  getCafeTablesWithQR: (cafeId: string) => request<any>(`/admin/cafes/${cafeId}/tables`),

  generateCafeTableQR: (
    cafeId: string,
    data: { tableNumber: string; label?: string; capacity?: number },
  ) =>
    request<any>(`/admin/cafes/${cafeId}/tables/generate-qr`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  bulkGenerateCafeTableQRs: (
    cafeId: string,
    data: { prefix?: string; startNumber: number; endNumber: number; capacity?: number },
  ) =>
    request<any>(`/admin/cafes/${cafeId}/tables/bulk-generate-qr`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
