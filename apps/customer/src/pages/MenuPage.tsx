import React, { useState } from 'react';
import { useCustomerStore } from '../stores/customerStore.js';
import { ItemDetailModal } from '../components/ItemDetailModal.js';
import { CallWaiterModal } from '../components/CallWaiterModal.js';
import { api } from '../services/api.js';

interface MenuPageProps {
  onOpenCart: () => void;
  onOpenOrders: () => void;
}

export const MenuPage: React.FC<MenuPageProps> = ({ onOpenCart, onOpenOrders }) => {
  const { categories, cafe, table, session, cart, setCart, activeOrders } = useCustomerStore();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    categories[0]?.id || null,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [activeItemForDetail, setActiveItemForDetail] = useState<any | null>(null);
  const [showWaiterModal, setShowWaiterModal] = useState(false);

  const activeCategory = categories.find((c) => c.id === selectedCategoryId) || categories[0];

  const filteredItems = (activeCategory?.items || []).filter((item: any) => {
    if (dietFilter === 'veg' && !item.isVeg) return false;
    if (dietFilter === 'non-veg' && item.isVeg) return false;
    if (searchQuery) {
      return (
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  const getItemQuantityInCart = (itemId: string) => {
    const found = cart.items.find((ci) => ci.itemId === itemId);
    return found ? found.quantity : 0;
  };

  const handleQuickAdd = async (item: any) => {
    if (item.optionGroups && item.optionGroups.length > 0) {
      setActiveItemForDetail(item);
      return;
    }

    try {
      await api.addCartItem({
        itemId: item.id,
        quantity: 1,
      });
      const updated = await api.getCart();
      setCart(updated.data);
    } catch (err: any) {
      alert(err.message || 'Failed to add item');
    }
  };

  const handleUpdateCartQty = async (itemId: string, newQty: number) => {
    const existing = cart.items.find((ci) => ci.itemId === itemId);
    if (!existing) return;

    try {
      if (newQty <= 0) {
        await api.removeCartItem(existing.id);
      } else {
        await api.updateCartItem(existing.id, { quantity: newQty });
      }
      const updated = await api.getCart();
      setCart(updated.data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const defaultFoodPhotos: Record<string, string> = {
    pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
    burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
    pasta: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=400&q=80',
    dessert: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=400&q=80',
    maggi: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80',
    beverage: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=400&q=80',
  };

  const getFoodImage = (item: any) => {
    if (item.imageUrl) return item.imageUrl;
    const nameLower = item.name.toLowerCase();
    for (const key of Object.keys(defaultFoodPhotos)) {
      if (nameLower.includes(key)) return defaultFoodPhotos[key];
    }
    return defaultFoodPhotos.pizza;
  };

  return (
    <div style={{ paddingBottom: 110, background: '#ffffff', minHeight: '100vh' }}>
      {/* SCREEN 5: TOP HEADER */}
      <header
        style={{
          padding: '14px 20px',
          background: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Cafe Avatar & Table Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#ff6b35',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 800,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {cafe?.logoUrl ? (
                <img src={cafe.logoUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                '👨‍🍳'
              )}
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark)', lineHeight: 1.2 }}>
                {cafe?.name || "The Foodie's Cafe"}
              </h2>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                Table {table?.tableNumber || '4'}
              </span>
            </div>
          </div>

          {/* Right Action Icons: Bell & Orders */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setShowWaiterModal(true)}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                position: 'relative',
              }}
            >
              🔔
              <span
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#ef4444',
                  border: '2px solid #ffffff',
                }}
              />
            </button>

            {activeOrders.length > 0 && (
              <button
                onClick={onOpenOrders}
                style={{
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Orders ({activeOrders.length})
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginTop: 14, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: 13, fontSize: 15, color: '#94a3b8' }}>🔍</span>
          <input
            type="text"
            placeholder="Search dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: 40,
              paddingTop: 11,
              paddingBottom: 11,
              borderRadius: 'var(--radius-full)',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: 14,
            }}
          />
        </div>

        {/* Filter Pills: All | Veg | Non-Veg */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={() => setDietFilter('all')}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: 13,
              fontWeight: 700,
              background: dietFilter === 'all' ? '#ff6b35' : '#ffffff',
              color: dietFilter === 'all' ? '#ffffff' : '#64748b',
              border: `1px solid ${dietFilter === 'all' ? '#ff6b35' : '#e2e8f0'}`,
            }}
          >
            All
          </button>

          <button
            onClick={() => setDietFilter(dietFilter === 'veg' ? 'all' : 'veg')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: 13,
              fontWeight: 700,
              background: dietFilter === 'veg' ? '#f0fdf4' : '#ffffff',
              color: dietFilter === 'veg' ? '#15803d' : '#64748b',
              border: `1.5px solid ${dietFilter === 'veg' ? '#22c55e' : '#e2e8f0'}`,
            }}
          >
            <span className="badge-veg" />
            Veg
          </button>

          <button
            onClick={() => setDietFilter(dietFilter === 'non-veg' ? 'all' : 'non-veg')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: 13,
              fontWeight: 700,
              background: dietFilter === 'non-veg' ? '#fef2f2' : '#ffffff',
              color: dietFilter === 'non-veg' ? '#b91c1c' : '#64748b',
              border: `1.5px solid ${dietFilter === 'non-veg' ? '#ef4444' : '#e2e8f0'}`,
            }}
          >
            <span className="badge-non-veg" />
            Non-Veg
          </button>
        </div>
      </header>

      {/* Promotional Banner */}
      <div style={{ padding: '16px 20px 8px' }}>
        <div
          style={{
            borderRadius: 18,
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 18px',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
            position: 'relative',
          }}
        >
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#f59e0b' }}>
              Special Deal
            </span>
            <h3 style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.2, marginTop: 2 }}>
              FLAT 15% OFF<br />on Combos
            </h3>
            <div style={{ marginTop: 8 }}>
              <span
                style={{
                  display: 'inline-block',
                  background: '#fef08a',
                  color: '#854d0e',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: 6,
                  letterSpacing: 0.5,
                }}
              >
                Use Code: CAFE15
              </span>
            </div>
          </div>

          <div style={{ width: 84, height: 84, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', flexShrink: 0 }}>
            <img
              src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=250&q=80"
              alt="Promo Pizza"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>
      </div>

      {/* Horizontal Category Scroll */}
      <div style={{ padding: '10px 20px', overflowX: 'auto', display: 'flex', gap: 10, scrollbarWidth: 'none' }}>
        {categories.map((cat) => {
          const isSelected = (selectedCategoryId || categories[0]?.id) === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              style={{
                padding: '8px 18px',
                borderRadius: 'var(--radius-full)',
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                background: isSelected ? '#ff6b35' : '#f8fafc',
                color: isSelected ? '#ffffff' : '#64748b',
                border: `1px solid ${isSelected ? '#ff6b35' : '#e2e8f0'}`,
                boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Dish List */}
      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: 32 }}>🍽</span>
            <p style={{ marginTop: 8, fontSize: 14 }}>No dishes found in this category.</p>
          </div>
        ) : (
          filteredItems.map((item: any, idx: number) => {
            const qty = getItemQuantityInCart(item.id);
            const isBestseller = idx === 0 || item.isBestseller;

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: 14,
                  borderRadius: 18,
                  border: '1px solid #f1f5f9',
                  background: '#ffffff',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative',
                }}
              >
                {/* Dish Photo */}
                <div style={{ width: 90, height: 90, borderRadius: 14, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                  <img
                    src={getFoodImage(item)}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                {/* Dish Info */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={item.isVeg ? 'badge-veg' : 'badge-non-veg'} />
                      <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--dark)' }}>{item.name}</h4>
                      {isBestseller && (
                        <span className="badge-bestseller">
                          ★ Bestseller
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark)' }}>
                      ₹{Math.round(item.pricePaise / 100)}
                    </span>

                    {/* Stepper or Add Button */}
                    {qty > 0 ? (
                      <div className="stepper-pill">
                        <button
                          onClick={() => handleUpdateCartQty(item.id, qty - 1)}
                          className="stepper-btn"
                        >
                          −
                        </button>
                        <span className="stepper-value">{qty}</span>
                        <button
                          onClick={() => handleUpdateCartQty(item.id, qty + 1)}
                          className="stepper-btn"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleQuickAdd(item)}
                        style={{
                          background: '#ffffff',
                          color: '#ff6b35',
                          border: '1.5px solid #ff6b35',
                          padding: '6px 18px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 13,
                          fontWeight: 800,
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        ADD +
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cart.totalItems > 0 && (
        <div className="floating-cart-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🛒</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>
              {cart.totalItems} {cart.totalItems === 1 ? 'item' : 'items'} • ₹{Math.round(cart.subtotalPaise / 100)}
            </span>
          </div>

          <button
            onClick={onOpenCart}
            style={{
              background: '#ff6b35',
              color: '#ffffff',
              padding: '8px 18px',
              borderRadius: 'var(--radius-full)',
              fontSize: 13,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>View Cart</span>
            <span>➔</span>
          </button>
        </div>
      )}

      {/* Customization Drawer Modal */}
      {activeItemForDetail && (
        <ItemDetailModal
          item={activeItemForDetail}
          onClose={() => setActiveItemForDetail(null)}
        />
      )}

      {/* Call Waiter Modal */}
      {showWaiterModal && (
        <CallWaiterModal onClose={() => setShowWaiterModal(false)} />
      )}
    </div>
  );
};
