/**
 * Customer types for the UI layer.
 *
 * Mirrors the server-side types from src/customers/types.ts but
 * kept separate since UI runs in the browser and cannot import
 * server modules directly.
 *
 * Phase 57.1: Remaining Tab UIs (Plan 02)
 */

// =============================================================================
// Customer Account
// =============================================================================

export interface CustomerAccount {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone?: string;
  logoKeys: string[];
  markupPercent: number;
  royaltyPercent: number;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Royalty Types
// =============================================================================

export interface RoyaltyLineItem {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  productName: string;
  sku: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  royaltyRate: number;
  royaltyPerUnit: number;
  royaltyTotal: number;
  discounted: boolean;
}

export interface RoyaltyReport {
  customerId: string;
  customerName: string;
  royaltyRate: number;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  lineItems: RoyaltyLineItem[];
  totalUnits: number;
  totalRevenue: number;
  totalRoyalty: number;
  discountedLineItems: number;
  orderCount: number;
}

// =============================================================================
// Pricing Types
// =============================================================================

export interface PricingResult {
  wholesaleCost: number;
  decorationCost: number;
  totalCost: number;
  retailPrice: number;
  margin: {
    dollars: number;
    percent: number;
  };
  royaltyPerUnit: number;
  netAfterRoyalty: number;
  variantPrices?: Record<string, number>;
}
