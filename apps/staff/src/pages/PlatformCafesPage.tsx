import React, { useEffect, useState } from 'react';
import { staffApi } from '../services/staffApi.js';

interface Cafe {
  id: string;
  name: string;
  slug: string;
  city?: string;
  status: string;
  logoUrl?: string;
  _count?: { tables: number; orders: number };
}

interface TableWithQR {
  id: string;
  tableNumber: string;
  label?: string;
  capacity?: number;
  isActive: boolean;
  createdAt: string;
  qrToken: string;
  qrUrl: string;
  qrDataUrl: string;
  qrSvg: string;
  isFixed: boolean;
}

export const PlatformCafesPage: React.FC = () => {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [selectedCafeId, setSelectedCafeId] = useState<string>('');
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [tables, setTables] = useState<TableWithQR[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablesLoading, setTablesLoading] = useState(false);

  // Single table form
  const [tableNumber, setTableNumber] = useState('');
  const [tableLabel, setTableLabel] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [generating, setGenerating] = useState(false);

  // Bulk generator form
  const [showBulk, setShowBulk] = useState(false);
  const [bulkPrefix, setBulkPrefix] = useState('Table ');
  const [bulkStart, setBulkStart] = useState('1');
  const [bulkEnd, setBulkEnd] = useState('8');
  const [bulkCapacity, setBulkCapacity] = useState('4');

  // Active previewed QR
  const [activeQR, setActiveQR] = useState<TableWithQR | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load Cafes list
  const loadCafes = async () => {
    try {
      setLoading(true);
      const res = await staffApi.getPlatformCafes({ limit: 50 });
      const cafeList = res.data || [];
      setCafes(cafeList);
      if (cafeList.length > 0 && !selectedCafeId) {
        setSelectedCafeId(cafeList[0].id);
        setSelectedCafe(cafeList[0]);
      }
    } catch (err: any) {
      console.error('Failed to load cafes:', err);
      showNotification(err.message || 'Failed to load cafes', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load Tables for selected cafe
  const loadTables = async (cafeId: string) => {
    if (!cafeId) return;
    try {
      setTablesLoading(true);
      const res = await staffApi.getCafeTablesWithQR(cafeId);
      setTables(res.data?.tables || []);
      if (res.data?.cafe) {
        setSelectedCafe(res.data.cafe);
      }
      if (res.data?.tables?.length > 0 && !activeQR) {
        setActiveQR(res.data.tables[0]);
      }
    } catch (err: any) {
      console.error('Failed to load cafe tables:', err);
      showNotification(err.message || 'Failed to load cafe tables', 'error');
    } finally {
      setTablesLoading(false);
    }
  };

  useEffect(() => {
    loadCafes();
  }, []);

  useEffect(() => {
    if (selectedCafeId) {
      const cafe = cafes.find((c) => c.id === selectedCafeId) || null;
      setSelectedCafe(cafe);
      loadTables(selectedCafeId);
    }
  }, [selectedCafeId]);

  // Generate single table QR
  const handleGenerateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCafeId) return;
    const cleanNum = tableNumber.trim();
    if (!cleanNum) {
      showNotification('Please enter a table number', 'error');
      return;
    }

    try {
      setGenerating(true);
      const res = await staffApi.generateCafeTableQR(selectedCafeId, {
        tableNumber: cleanNum,
        label: tableLabel.trim() || undefined,
        capacity: Number(capacity) || 4,
      });

      const qrResult = res.data;
      showNotification(qrResult.message || `Fixed QR for ${cleanNum} ready!`, 'success');

      // Update tables list
      await loadTables(selectedCafeId);

      // Set active preview
      if (qrResult.table) {
        setActiveQR({
          ...qrResult.table,
          qrToken: qrResult.qrToken,
          qrUrl: qrResult.qrUrl,
          qrDataUrl: qrResult.qrDataUrl,
          qrSvg: qrResult.qrSvg,
          isFixed: true,
        });
      }

      setTableNumber('');
      setTableLabel('');
    } catch (err: any) {
      showNotification(err.message || 'Failed to generate QR', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Bulk generate
  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCafeId) return;
    const start = Number(bulkStart);
    const end = Number(bulkEnd);

    if (isNaN(start) || isNaN(end) || start > end) {
      showNotification('Please provide a valid start and end number', 'error');
      return;
    }

    try {
      setGenerating(true);
      const res = await staffApi.bulkGenerateCafeTableQRs(selectedCafeId, {
        prefix: bulkPrefix,
        startNumber: start,
        endNumber: end,
        capacity: Number(bulkCapacity) || 4,
      });

      showNotification(`Successfully generated ${res.data?.length || (end - start + 1)} fixed table QRs!`, 'success');
      setShowBulk(false);
      await loadTables(selectedCafeId);
    } catch (err: any) {
      showNotification(err.message || 'Bulk generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Download QR PNG
  const downloadPng = (qr: TableWithQR) => {
    const link = document.createElement('a');
    link.href = qr.qrDataUrl;
    link.download = `QR_${selectedCafe?.slug || 'cafe'}_${qr.tableNumber.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification(`Downloaded PNG for ${qr.tableNumber}`);
  };

  // Download QR SVG
  const downloadSvg = (qr: TableWithQR) => {
    const blob = new Blob([qr.qrSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR_${selectedCafe?.slug || 'cafe'}_${qr.tableNumber.replace(/\s+/g, '_')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification(`Downloaded SVG for ${qr.tableNumber}`);
  };

  // Copy scan link
  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    showNotification('Fixed QR scan link copied to clipboard!');
  };

  // Print single tent card
  const printTentCard = (qr: TableWithQR) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print table tent cards');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR - Table ${qr.tableNumber} | ${selectedCafe?.name || 'CafeQR'}</title>
          <style>
            @page { size: auto; margin: 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 90vh;
              background: #ffffff;
            }
            .tent-card {
              width: 320px;
              border: 3px solid #ff6b35;
              border-radius: 24px;
              padding: 28px 24px;
              text-align: center;
              box-shadow: 0 10px 25px rgba(0,0,0,0.08);
            }
            .brand-name {
              font-size: 22px;
              font-weight: 800;
              color: #131926;
              margin-bottom: 4px;
            }
            .table-badge {
              display: inline-block;
              background: #fff7ed;
              color: #c2410c;
              border: 1.5px solid #fed7aa;
              font-size: 15px;
              font-weight: 800;
              padding: 6px 18px;
              border-radius: 30px;
              margin: 12px 0 18px;
            }
            .qr-frame {
              background: #ffffff;
              padding: 12px;
              border-radius: 16px;
              display: inline-block;
              border: 2px dashed #e2e8f0;
            }
            .qr-frame img {
              width: 210px;
              height: 210px;
              display: block;
            }
            .instructions {
              margin-top: 18px;
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
            }
            .sub-instructions {
              font-size: 12px;
              color: #64748b;
              margin-top: 4px;
            }
            .fixed-note {
              margin-top: 20px;
              font-size: 10px;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          <div class="tent-card">
            <div style="font-size: 28px; margin-bottom: 6px;">👨‍🍳</div>
            <div class="brand-name">${selectedCafe?.name || "The Foodie's Cafe"}</div>
            <div class="table-badge">${qr.tableNumber}</div>
            <div class="qr-frame">
              <img src="${qr.qrDataUrl}" alt="Table QR" />
            </div>
            <div class="instructions">📷 Scan with Phone Camera</div>
            <div class="sub-instructions">View Menu • Place Order • Settle Bill</div>
            <div class="fixed-note">🔒 Permanent Fixed Table QR • Powered by CafeQR</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ flex: 1, height: '100vh', overflowY: 'auto', background: '#f8fafc', padding: '24px 32px' }}>
      {/* Top Banner Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 32,
            zIndex: 9999,
            background: notification.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            fontSize: 14,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>{notification.type === 'error' ? '⚠️' : '✓'}</span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Title & Super Admin Context */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 24 }}>🛡️</span>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Platform Super Admin — Fixed Table QR Generator
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Generate and manage permanent cryptographic QR codes according to table numbers for any cafe. Once generated, each QR is permanently fixed and will never expire.
          </p>
        </div>

        {/* Cafe Dropdown Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#ffffff', padding: '8px 16px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Select Cafe:</span>
          <select
            value={selectedCafeId}
            onChange={(e) => setSelectedCafeId(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1.5px solid #cbd5e1',
              fontSize: 14,
              fontWeight: 700,
              color: '#0f172a',
              background: '#f8fafc',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {cafes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.city || 'Indore'}) — {c.slug}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Cafe Card Info */}
      {selectedCafe && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '16px 24px',
            border: '1px solid #e2e8f0',
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: '#fff7ed',
                border: '1.5px solid #ffedd5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}
            >
              🏪
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a' }}>{selectedCafe.name}</h3>
                <span
                  style={{
                    background: '#f0fdf4',
                    color: '#166534',
                    border: '1px solid #bbf7d0',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 20,
                  }}
                >
                  ✓ Verified Cafe
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                Slug: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>/c/{selectedCafe.slug}</code> • {selectedCafe.city || 'Indore, MP'} • Total Tables: <strong>{tables.length}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setShowBulk(!showBulk)}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                border: '1.5px solid #cbd5e1',
                background: showBulk ? '#f1f5f9' : '#ffffff',
                color: '#334155',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {showBulk ? '✕ Close Batch Generator' : '⚡ Batch Generate (e.g. Tables 1-10)'}
            </button>
          </div>
        </div>
      )}

      {/* Fixed QR Guarantee Callout */}
      <div
        style={{
          background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
          border: '1.5px solid #fdba74',
          borderRadius: 16,
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div style={{ fontSize: 32 }}>🔒</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#9a3412', marginBottom: 2 }}>
            Guaranteed Fixed QR Token Architecture
          </div>
          <div style={{ fontSize: 13, color: '#c2410c', lineHeight: 1.4 }}>
            Each QR code is signed with HMAC-SHA256 and mapped to this specific cafe & table. Once generated, the table token is permanently fixed and will <strong>never expire</strong> or change—making it 100% safe to print on acrylic stands, table stickers, and wooden blocks without ever re-printing.
          </div>
        </div>
      </div>

      {/* Generator Box & Active Preview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Left: Generator Form */}
        <div style={{ background: '#ffffff', borderRadius: 20, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {!showBulk ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 20 }}>🏷️</span>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Generate Fixed QR by Table Number
                </h3>
              </div>

              <form onSubmit={handleGenerateSingle}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Table Number / Identifier *
                  </label>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="e.g. Table 04, T-01, Rooftop 3"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'block' }}>
                    If this table already exists, the system retrieves its existing permanent fixed QR without altering it.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Seating Capacity
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #cbd5e1',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Section / Label (Optional)
                    </label>
                    <input
                      type="text"
                      value={tableLabel}
                      onChange={(e) => setTableLabel(e.target.value)}
                      placeholder="e.g. Indoor AC, Garden"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #cbd5e1',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={generating}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: 12,
                    background: '#ff6b35',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: generating ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {generating ? 'Generating Fixed QR...' : '⚡ Generate Fixed Table QR Code'}
                </button>
              </form>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 20 }}>📦</span>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Batch Generate Fixed Table QRs (Range)
                </h3>
              </div>

              <form onSubmit={handleBulkGenerate}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Table Prefix
                  </label>
                  <input
                    type="text"
                    value={bulkPrefix}
                    onChange={(e) => setBulkPrefix(e.target.value)}
                    placeholder="e.g. Table  or  T-"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      fontSize: 14,
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Start Table
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={bulkStart}
                      onChange={(e) => setBulkStart(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      End Table
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={bulkEnd}
                      onChange={(e) => setBulkEnd(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Seats / Table
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={bulkCapacity}
                      onChange={(e) => setBulkCapacity(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14 }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={generating}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: 12,
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: generating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {generating ? 'Processing batch...' : `⚡ Batch Generate ${Number(bulkEnd) - Number(bulkStart) + 1} Fixed QRs`}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right: Active QR Code Preview & Direct Actions */}
        <div style={{ background: '#ffffff', borderRadius: 20, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {activeQR ? (
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span
                  style={{
                    background: '#f0fdf4',
                    color: '#166534',
                    border: '1px solid #bbf7d0',
                    fontSize: 12,
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: 20,
                  }}
                >
                  🔒 Fixed QR Verified
                </span>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Permanent Token</span>
              </div>

              {/* QR Image Frame */}
              <div
                style={{
                  background: '#ffffff',
                  border: '2px solid #e2e8f0',
                  borderRadius: 18,
                  padding: 16,
                  display: 'inline-block',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.04)',
                  marginBottom: 12,
                }}
              >
                <img
                  src={activeQR.qrDataUrl}
                  alt={`QR for ${activeQR.tableNumber}`}
                  style={{ width: 180, height: 180, display: 'block' }}
                />
              </div>

              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
                {activeQR.tableNumber}
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 14px' }}>
                {selectedCafe?.name} {activeQR.label ? `• ${activeQR.label}` : ''} ({activeQR.capacity || 4} seats)
              </p>

              {/* Direct Scan URL Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '8px 12px',
                  fontSize: 11,
                  color: '#475569',
                  wordBreak: 'break-all',
                  marginBottom: 16,
                  textAlign: 'left',
                }}
              >
                <strong>Scan URL:</strong> {activeQR.qrUrl}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <button
                  onClick={() => downloadPng(activeQR)}
                  style={{
                    padding: '10px',
                    borderRadius: 10,
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⬇️ Download PNG
                </button>

                <button
                  onClick={() => downloadSvg(activeQR)}
                  style={{
                    padding: '10px',
                    borderRadius: 10,
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⬇️ Download SVG
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                <button
                  onClick={() => printTentCard(activeQR)}
                  style={{
                    padding: '10px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#ff6b35',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  🖨️ Print Tent Card
                </button>

                <button
                  onClick={() => copyLink(activeQR.qrUrl)}
                  style={{
                    padding: '10px',
                    borderRadius: 10,
                    border: '1.5px solid #fed7aa',
                    background: '#fff7ed',
                    color: '#c2410c',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📋 Copy Link
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '60px 20px', color: '#94a3b8' }}>
              Select a table from below or generate a new one to preview its fixed QR code.
            </div>
          )}
        </div>
      </div>

      {/* Complete Tables Grid for this Cafe */}
      <div style={{ background: '#ffffff', borderRadius: 20, padding: 24, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              All Generated Tables for {selectedCafe?.name || 'Selected Cafe'}
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>
              {tables.length} permanent fixed table QRs configured and ready for printing.
            </p>
          </div>

          {tables.length > 0 && (
            <button
              onClick={() => {
                tables.forEach((t, idx) => {
                  setTimeout(() => printTentCard(t), idx * 300);
                });
              }}
              style={{
                padding: '9px 16px',
                borderRadius: 10,
                border: '1.5px solid #ff6b35',
                background: '#fff7ed',
                color: '#c2410c',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🖨️ Print All {tables.length} Table Cards
            </button>
          )}
        </div>

        {tablesLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading fixed table QRs...</div>
        ) : tables.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            No tables generated yet for this cafe. Use the form above to generate your first fixed table QR!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {tables.map((t) => {
              const isSelected = activeQR?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setActiveQR(t)}
                  style={{
                    background: isSelected ? '#fff7ed' : '#ffffff',
                    border: isSelected ? '2px solid #ff6b35' : '1.5px solid #e2e8f0',
                    borderRadius: 14,
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                  }}
                >
                  <img
                    src={t.qrDataUrl}
                    alt={`QR ${t.tableNumber}`}
                    style={{ width: 100, height: 100, borderRadius: 8, marginBottom: 10 }}
                  />
                  <h4 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 2px', color: '#0f172a' }}>
                    {t.tableNumber}
                  </h4>
                  <span style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                    {t.label || `${t.capacity || 4} Seats`}
                  </span>

                  <div style={{ display: 'flex', gap: 6, width: '100%', marginTop: 'auto' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadPng(t);
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      PNG
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        printTentCard(t);
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        borderRadius: 6,
                        border: 'none',
                        background: '#ff6b35',
                        color: '#ffffff',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Print
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
