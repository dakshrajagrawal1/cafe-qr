import { create } from 'zustand';

export interface CustomerUser {
  id: string;
  name: string;
  phone: string;
}

export interface CafeInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  currency: string;
  allowPayAtEnd: boolean;
}

export interface TableInfo {
  id: string;
  tableNumber: string;
  label?: string | null;
}

export interface SessionInfo {
  id: string;
  pin: string;
  color: string;
  status: string;
}

export interface CartItem {
  id: string;
  itemId: string;
  name: string;
  basePricePaise: number;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  isVeg: boolean;
  imageUrl?: string | null;
  selectedOptions?: any[];
  specialInstructions?: string | null;
  addedByName: string;
}

interface CustomerState {
  // Auth state
  customer: CustomerUser | null;
  customerToken: string | null;
  deviceToken: string | null;

  // Session & Cafe state
  tableToken: string | null;
  cafe: CafeInfo | null;
  table: TableInfo | null;
  session: SessionInfo | null;
  memberId: string | null;

  // Menu & Cart state
  categories: any[];
  cart: { items: CartItem[]; subtotalPaise: number; totalItems: number };
  activeOrders: any[];

  // Actions
  setAuth: (customer: CustomerUser, token: string, deviceToken: string) => void;
  setTableToken: (token: string) => void;
  setSessionData: (data: { cafe: CafeInfo; table: TableInfo; session: SessionInfo; memberId: string }) => void;
  setCategories: (categories: any[]) => void;
  setCart: (cart: { items: CartItem[]; subtotalPaise: number; totalItems: number }) => void;
  setActiveOrders: (orders: any[]) => void;
  logout: () => void;
}

export const useCustomerStore = create<CustomerState>((set) => {
  // Load saved tokens
  const savedToken = localStorage.getItem('tableqr_cust_token');
  const savedDeviceToken = localStorage.getItem('tableqr_cust_device_token');
  const savedCustomer = localStorage.getItem('tableqr_cust_user');

  return {
    customer: savedCustomer ? JSON.parse(savedCustomer) : null,
    customerToken: savedToken,
    deviceToken: savedDeviceToken,

    tableToken: sessionStorage.getItem('tableqr_table_token'),
    cafe: null,
    table: null,
    session: null,
    memberId: localStorage.getItem('tableqr_member_id'),

    categories: [],
    cart: { items: [], subtotalPaise: 0, totalItems: 0 },
    activeOrders: [],

    setAuth: (customer, token, deviceToken) => {
      localStorage.setItem('tableqr_cust_token', token);
      localStorage.setItem('tableqr_cust_device_token', deviceToken);
      localStorage.setItem('tableqr_cust_user', JSON.stringify(customer));
      set({ customer, customerToken: token, deviceToken });
    },

    setTableToken: (token) => {
      sessionStorage.setItem('tableqr_table_token', token);
      set({ tableToken: token });
    },

    setSessionData: (data) => {
      localStorage.setItem('tableqr_session_id', data.session.id);
      localStorage.setItem('tableqr_member_id', data.memberId);
      set({
        cafe: data.cafe,
        table: data.table,
        session: data.session,
        memberId: data.memberId,
      });
    },

    setCategories: (categories) => set({ categories }),
    setCart: (cart) => set({ cart }),
    setActiveOrders: (activeOrders) => set({ activeOrders }),

    logout: () => {
      localStorage.removeItem('tableqr_cust_token');
      localStorage.removeItem('tableqr_cust_user');
      set({ customer: null, customerToken: null });
    },
  };
});
