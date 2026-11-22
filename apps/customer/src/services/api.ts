const API_BASE = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : 'https://cafe-qr-api.onrender.com') + '/api';

function getHeaders(customHeaders: Record<string, string> = {}) {
  const token = localStorage.getItem('tableqr_cust_token');
  const sessionId = localStorage.getItem('tableqr_session_id');
  const memberId = localStorage.getItem('tableqr_member_id');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (sessionId) headers['x-session-id'] = sessionId;
  if (memberId) headers['x-member-id'] = memberId;

  return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: getHeaders(options.headers as any),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Something went wrong');
  }
  return json;
}

export const api = {
  // 1. Table Verification
  verifyTableToken: (token: string) =>
    request<any>(`/tables/verify?t=${encodeURIComponent(token)}`),

  // 2. Public Menu
  getPublicMenu: (slug: string) =>
    request<any>(`/menu/public/${slug}`),

  // 3. Customer OTP Auth
  sendOtp: (phone: string) =>
    request<any>('/auth/customer/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, otp: string, name?: string, consentGiven?: boolean) =>
    request<any>('/auth/customer/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, name, consentGiven }),
    }),

  // 4. Session Init
  initSession: (tableToken: string, deviceToken: string, pin?: string) =>
    request<any>('/customer/session/init', {
      method: 'POST',
      body: JSON.stringify({ tableToken, deviceToken, pin }),
    }),

  // 5. Cart
  getCart: () => request<any>('/customer/cart'),

  addCartItem: (data: {
    itemId: string;
    quantity: number;
    selectedOptions?: any[];
    specialInstructions?: string;
  }) =>
    request<any>('/customer/cart/item', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCartItem: (cartItemId: string, data: { quantity?: number; specialInstructions?: string }) =>
    request<any>(`/customer/cart/item/${cartItemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  removeCartItem: (cartItemId: string) =>
    request<any>(`/customer/cart/item/${cartItemId}`, {
      method: 'DELETE',
    }),

  // 6. Orders
  placeOrder: (notes?: string) =>
    request<any>('/customer/order', {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),

  getSessionOrders: () => request<any>('/customer/orders'),

  // 7. Waiter Calls
  callWaiter: (type: 'help' | 'water' | 'bill' | 'other', message?: string) =>
    request<any>('/customer/waiter-call', {
      method: 'POST',
      body: JSON.stringify({ type, message }),
    }),
};
