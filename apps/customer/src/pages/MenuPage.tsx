import React, { useState } from 'react';
import { useCustomerStore } from '../stores/customerStore.js';
import { ItemDetailModal } from '../components/ItemDetailModal.js';
import { CallWaiterModal } from '../components/CallWaiterModal.js';

interface MenuPageProps {
  onOpenCart: () => void;
  onOpenOrders: () => void;
}

export const MenuPage: React.FC<MenuPageProps> = ({ onOpenCart, onOpenOrders }) => {
  const { categories, cafe, table, session, cart, activeOrders } = useCustomerStore();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    categories[0]?.id || null,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [activeItemForDetail, setActiveItemForDetail] = useState<any | null>(null);
  const [showWaiterModal, setShowWaiterModal] = useState(false);

  const activeCategory = categories.find((c) => c.id === selectedCategoryId) || categories[0];

  const filteredItems = (activeCategory?.items || []).filter((item: any) => {
    if (vegOnly && !item.isVeg) return false;
    if (searchQuery) {
      return (
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Top Header */}
      <header style={{ padding: '16px 20px', background: '#ffffff', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--dark)' }}>{cafe?.name || 'Cafe'}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: session?.color || '#22c55e' }} />
              <span>Table {table?.tableNumber}</span>
              {session?.pin && <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, fontWeight: 700, color: '#334155' }}>PIN: {session.pin}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowWaiterModal(true)}
              style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#334155' }}
            >
              🛎️ Waiter
            </button>
            {activeOrders.length > 0 && (
              <button
                onClick={onOpenOrders}
                style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}
              >
                Orders ({activeOrders.length})
              </button>
            )}
          </div>
        </div>

        {/* Search & Veg Filter */}
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Search dishes, drinks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36, fontSize: 14 }}
            />
            <span style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }}>🔍</span>
          </div>

          <button
            onClick={() => setVegOnly(!vegOnly)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 12px',
              borderRadius: 10,
              border: `1.5px solid ${vegOnly ? 'var(--veg)' : 'var(--border)'}`,
              background: vegOnly ? '#f0fdf4' : '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              color: vegOnly ? '#15803d' : 'var(--text-muted)',
            }}
          >
            <span className="badge-veg" />
            Veg
          </button>
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 12, paddingBottom: 4, scrollbarWidth: 'none' }}>
          {categories.map((cat: any) => {
            const isSelected = (selectedCategoryId || categories[0]?.id) === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  background: isSelected ? 'var(--primary)' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#475569',
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </header>

      {/* Menu Items List */}
      <main style={{ padding: '16px 20px' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>
          {activeCategory?.name} ({filteredItems.length})
        </h3>

        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🍽️</div>
            <p>No dishes found matching your selection.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredItems.map((item: any) => (
              <div
                key={item.id}
                onClick={() => !item.isSoldOut && setActiveItemForDetail(item)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: 14,
                  background: '#ffffff',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: item.isSoldOut ? 'not-allowed' : 'pointer',
                  opacity: item.isSoldOut ? 0.6 : 1,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ flex: 1, paddingRight: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={item.isVeg ? 'badge-veg' : 'badge-non-veg'} />
                    <h4 style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</h4>
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--dark)', marginTop: 4 }}>
                    ₹{(item.pricePaise / 100).toFixed(0)}
                  </div>

                  {item.description && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description}
                    </p>
                  )}

                  {item.optionGroups && item.optionGroups.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, marginTop: 6 }}>
                      Customisable
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', marginBottom: 8 }}
                    />
                  )}
                  {item.isSoldOut ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: '#fee2e2', padding: '4px 8px', borderRadius: 6 }}>
                      Sold Out
                    </span>
                  ) : (
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 16px', fontSize: 13 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveItemForDetail(item);
                      }}
                    >
                      ADD +
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Item Customization Modal */}
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

      {/* Floating Cart Button */}
      {cart.totalItems > 0 && (
        <div className="bottom-bar">
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cart.totalItems} Items selected</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--dark)' }}>
              ₹{(cart.subtotalPaise / 100).toFixed(2)}
            </div>
          </div>
          <button
            onClick={onOpenCart}
            className="btn-primary"
            style={{ width: 'auto', padding: '12px 24px' }}
          >
            View Cart ➔
          </button>
        </div>
      )}
    </div>
  );
};
