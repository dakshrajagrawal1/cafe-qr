// ============================================================
// QR Code Generation
// ============================================================

import QRCode from 'qrcode';
import { env } from '../config/env.js';
import { signTableToken } from './hmac.js';

interface QROptions {
  cafeSlug: string;
  cafeId: string;
  tableId: string;
  width?: number;
}

/**
 * Generate a QR code as a data URL (base64 PNG).
 * URL format: {baseUrl}/c/{slug}?t={signedToken}
 */
export async function generateTableQR(options: QROptions): Promise<string> {
  const token = signTableToken({
    cafeId: options.cafeId,
    tableId: options.tableId,
  });

  const url = `${env.API_BASE_URL}/c/${options.cafeSlug}?t=${token}`;

  const dataUrl = await QRCode.toDataURL(url, {
    width: options.width ?? 400,
    margin: 2,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });

  return dataUrl;
}

/**
 * Generate QR code as SVG string.
 */
export async function generateTableQRSvg(options: QROptions): Promise<string> {
  const token = signTableToken({
    cafeId: options.cafeId,
    tableId: options.tableId,
  });

  const url = `${env.API_BASE_URL}/c/${options.cafeSlug}?t=${token}`;

  return QRCode.toString(url, {
    type: 'svg',
    margin: 2,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}

