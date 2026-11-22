import type { CafeStatus, DocumentType, DocumentStatus } from '../constants/statuses.js';

export interface CafeSummary {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  email: string;
  phone: string;
  address?: string | null;
  city?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  currency: string;
  status: CafeStatus;
  fssaiNumber?: string | null;
  createdAt: string;
}

export interface CafeSettingsSummary {
  id: string;
  cafeId: string;
  kitchenMode: boolean;
  allowPayAtEnd: boolean;
  useManagerLogin: boolean;
  gstEnabled: boolean;
  gstRate: number;
  serviceChargeEnabled: boolean;
  serviceChargeRate: number;
  defaultPrepTimeMin: number;
}

export interface CafeDocumentSummary {
  id: string;
  cafeId: string;
  type: DocumentType;
  documentNumber?: string | null;
  expiryDate?: string | null;
  originalName: string;
  mimeType: string;
  fileSize: number;
  status: DocumentStatus;
  rejectionReason?: string | null;
  createdAt: string;
}

