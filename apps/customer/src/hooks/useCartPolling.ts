import { useEffect } from 'react';
import { api } from '../services/api.js';
import { useCustomerStore } from '../stores/customerStore.js';

/**
 * Polls the shared table session cart every 2.5 seconds.
 * Ensures all foodies seated at the same table see additions,
 * removals, and quantity adjustments in real time.
 */
export function useCartPolling(sessionId: string | null | undefined) {
  const setCart = useCustomerStore((s) => s.setCart);

  useEffect(() => {
    if (!sessionId) return;

    let isMounted = true;

    async function pollCart() {
      try {
        const res = await api.getCart();
        if (isMounted && res.data) {
          setCart(res.data);
        }
      } catch (err) {
        // Silently continue polling
      }
    }

    const interval = setInterval(pollCart, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId, setCart]);
}
