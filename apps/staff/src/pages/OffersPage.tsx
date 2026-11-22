import React, { useState, useEffect } from 'react';
import { staffApi } from '../services/staffApi.js';

interface Offer {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderPaise: number;
  isPromotion: boolean;
  isActive: boolean;
  createdAt: string;
}

export const OffersPage: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minOrderRupees, setMinOrderRupees] = useState<number>(200);
  const [isPromotion, setIsPromotion] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchOffers = async () => {
    try {
      const res = await staffApi.getOffers();
      setOffers(res.data || []);
    } catch (err: any) {
      console.error('Failed to load offers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleTogglePromotion = async (offer: Offer) => {
    try {
      await staffApi.updateOffer(offer.id, { isPromotion: !offer.isPromotion });
      await fetchOffers();
    } catch (err: any) {
      alert(`Failed to update slider toggle: ${err.message}`);
    }
  };

  const handleToggleActive = async (offer: Offer) => {
    try {
      await staffApi.updateOffer(offer.id, { isActive: !offer.isActive });
      await fetchOffers();
    } catch (err: any) {
      alert(`Failed to toggle status: ${err.message}`);
    }
  };

  const handleDelete = async (offerId: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;
    try {
      await staffApi.deleteOffer(offerId);
      await fetchOffers();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await staffApi.createOffer({
        title,
        description: description || undefined,
        discountType,
        discountValue:
          discountType === 'fixed'
            ? Math.round(discountValue * 100) // Fixed rupee discount in paise
            : discountValue * 100,            // Percentage basis points
        minOrderPaise: Math.round(minOrderRupees * 100),
        isPromotion,
        isActive: true,
      });

      alert('Offer created successfully!');
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      await fetchOffers();
    } catch (err: any) {
      alert(`Error creating offer: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ flex: 1, height: '100vh', overflowY: 'auto', padding: '24px 32px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Offers & Promotions</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Create discount deals and feature them on the customer landing promotion slider.
          </p>
        </div>

        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          + Create New Offer
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          Loading offers...
        </div>
      ) : offers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: '#ffffff', borderRadius: 16, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🏷️</div>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>No Active Offers Yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Create discounts and showcase special combos on the customer digital menu.
          </p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary" style={{ marginTop: 16 }}>
            Create First Offer
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {offers.map((offer) => {
            const displayValue =
              offer.discountType === 'percentage'
                ? `${offer.discountValue / 100}% OFF`
                : `₹${(offer.discountValue / 100).toFixed(0)} OFF`;

            return (
              <div
                key={offer.id}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid var(--border)',
                  borderRadius: 14,
                  padding: 20,
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <span
                      style={{
                        background: '#fef3c7',
                        color: '#b45309',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      {displayValue}
                    </span>

                    <button
                      onClick={() => handleToggleActive(offer)}
                      style={{
                        background: offer.isActive ? '#dcfce7' : '#fee2e2',
                        color: offer.isActive ? '#15803d' : '#dc2626',
                        border: 'none',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {offer.isActive ? 'Active ●' : 'Paused ○'}
                    </button>
                  </div>

                  <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 6px' }}>{offer.title}</h3>
                  {offer.description && (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 10px' }}>
                      {offer.description}
                    </p>
                  )}

                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Min order: ₹{(offer.minOrderPaise / 100).toFixed(0)}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, marginTop: 14 }}>
                  {/* Promo Slider Toggle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, display: 'block' }}>
                        Promotion Slider
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Show on customer QR banner
                      </span>
                    </div>

                    <button
                      onClick={() => handleTogglePromotion(offer)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 20,
                        background: offer.isPromotion ? 'var(--primary)' : '#e2e8f0',
                        color: offer.isPromotion ? '#ffffff' : '#64748b',
                        border: 'none',
                        fontWeight: 800,
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      {offer.isPromotion ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button
                      onClick={() => handleDelete(offer.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Offer Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Create Cafe Offer</h3>

            <form onSubmit={handleCreateOffer} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  Offer Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. 15% OFF Weekend Special"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Applicable on all pizzas and beverages"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    Discount Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Rupees (₹)</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    Discount Value {discountType === 'percentage' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  Minimum Order Value (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={minOrderRupees}
                  onChange={(e) => setMinOrderRupees(Number(e.target.value))}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={isPromotion}
                  onChange={(e) => setIsPromotion(e.target.checked)}
                />
                <span>Highlight on customer QR promotion slider</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Creating...' : 'Create Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
