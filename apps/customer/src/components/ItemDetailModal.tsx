import React, { useState } from 'react';
import { api } from '../services/api.js';
import { useCustomerStore } from '../stores/customerStore.js';

interface ItemDetailModalProps {
  item: any;
  onClose: () => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, onClose }) => {
  const { session, memberId, setCart } = useCustomerStore();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, any>>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize defaults for required option groups
  useState(() => {
    const defaults: Record<string, any> = {};
    if (item.optionGroups) {
      for (const og of item.optionGroups) {
        if (og.isRequired && og.options?.length > 0) {
          defaults[og.name] = og.options[0];
        }
      }
    }
    setSelectedOptions(defaults);
  });

  const handleSelectOption = (groupName: string, option: any, isSingle: boolean) => {
    if (isSingle) {
      setSelectedOptions((prev) => ({ ...prev, [groupName]: option }));
    } else {
      setSelectedOptions((prev) => {
        const currentList = Array.isArray(prev[groupName]) ? prev[groupName] : [];
        const exists = currentList.find((o: any) => o.name === option.name);
        if (exists) {
          return { ...prev, [groupName]: currentList.filter((o: any) => o.name !== option.name) };
        } else {
          return { ...prev, [groupName]: [...currentList, option] };
        }
      });
    }
  };

  // Calculate dynamic unit price
  let calculatedUnitPrice = item.pricePaise;
  for (const val of Object.values(selectedOptions)) {
    if (Array.isArray(val)) {
      for (const opt of val) calculatedUnitPrice += opt.extraPricePaise || 0;
    } else if (val) {
      calculatedUnitPrice += (val as any).extraPricePaise || 0;
    }
  }

  const handleAddToCart = async () => {
    if (!session || !memberId) return;

    // Validate required options
    if (item.optionGroups) {
      for (const og of item.optionGroups) {
        if (og.isRequired && !selectedOptions[og.name]) {
          setError(`Please select a ${og.name}`);
          return;
        }
      }
    }

    // Flatten options for snapshot
    const flatOptions: any[] = [];
    for (const [groupName, val] of Object.entries(selectedOptions)) {
      if (Array.isArray(val)) {
        for (const opt of val) {
          flatOptions.push({ groupName, optionName: opt.name, extraPricePaise: opt.extraPricePaise || 0 });
        }
      } else if (val) {
        flatOptions.push({ groupName, optionName: (val as any).name, extraPricePaise: (val as any).extraPricePaise || 0 });
      }
    }

    setLoading(true);
    try {
      await api.addCartItem({
        itemId: item.id,
        quantity,
        selectedOptions: flatOptions,
        specialInstructions: specialInstructions.trim() || undefined,
      });

      // Refresh cart
      const updatedCart = await api.getCart();
      setCart(updatedCart.data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add item to cart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={item.isVeg ? 'badge-veg' : 'badge-non-veg'} />
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>{item.name}</h3>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', borderRadius: '50%', width: 32, height: 32, fontWeight: 700 }}>
            ✕
          </button>
        </div>

        {item.description && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{item.description}</p>
        )}

        {error && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Option Groups */}
        {item.optionGroups?.map((og: any) => {
          const isSingle = og.maxSelect === 1;
          return (
            <div key={og.id} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{og.name}</span>
                {og.isRequired && (
                  <span style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                    Required
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {og.options?.map((opt: any) => {
                  const isChecked = isSingle
                    ? selectedOptions[og.name]?.name === opt.name
                    : (selectedOptions[og.name] || []).some((o: any) => o.name === opt.name);

                  return (
                    <label
                      key={opt.id}
                      onClick={() => handleSelectOption(og.name, opt, isSingle)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        border: `1.5px solid ${isChecked ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 10,
                        background: isChecked ? 'var(--primary-light)' : '#ffffff',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type={isSingle ? 'radio' : 'checkbox'}
                          name={og.name}
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ width: 'auto' }}
                        />
                        <span style={{ fontSize: 14, fontWeight: isChecked ? 700 : 500 }}>{opt.name}</span>
                      </div>
                      {opt.extraPricePaise > 0 && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
                          +₹{(opt.extraPricePaise / 100).toFixed(0)}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Special Instructions */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
            Special Instructions / Allergies (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Less spicy, no onion, extra napkins"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
          />
        </div>

        {/* Quantity Controls & Add Button */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              style={{ width: 36, height: 36, background: '#ffffff', borderRadius: 8, fontWeight: 700, fontSize: 16 }}
            >
              -
            </button>
            <span style={{ width: 36, textAlign: 'center', fontWeight: 700, fontSize: 16 }}>{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              style={{ width: 36, height: 36, background: '#ffffff', borderRadius: 8, fontWeight: 700, fontSize: 16 }}
            >
              +
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={loading}
            className="btn-primary"
            style={{ flex: 1 }}
          >
            {loading ? 'Adding...' : `Add to Cart • ₹{((calculatedUnitPrice * quantity) / 100).toFixed(0)}`}
          </button>
        </div>
      </div>
    </div>
  );
};
