/**
 * Customer Account Types
 *
 * Type definitions for the B2B customer account system. Each customer
 * represents a brand relationship with configurable markup and royalty
 * rates. Customer accounts bridge the logo system to royalty reporting.
 *
 * Phase 53: Customer & Royalty System (v2.0 port)
 */

// =============================================================================
// Customer Account
// =============================================================================

/**
 * A B2B customer account representing a brand relationship.
 *
 * Each customer has a single markup percentage applied to wholesale cost
 * and a royalty rate percentage for royalty reporting. Logo keys link
 * the customer to the logo registry.
 */
export interface CustomerAccount {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Brand/company name (used for order matching) */
  name: string;
  /** Primary contact person */
  contactName: string;
  /** Contact email */
  email: string;
  /** Contact phone (optional) */
  phone?: string;
  /** Array of logo registry keys (references logos.json keys) */
  logoKeys: string[];
  /** Single markup percentage applied to wholesale cost (e.g., 40 = cost * 1.40) */
  markupPercent: number;
  /** Royalty rate percentage on retail sales */
  royaltyPercent: number;
  /** Free-text notes (optional) */
  notes?: string;
  /** Whether account is currently active */
  active: boolean;
  /** ISO-8601 creation timestamp */
  createdAt: string;
  /** ISO-8601 last update timestamp */
  updatedAt: string;
}

// =============================================================================
// Customer Pricing
// =============================================================================

/** Pricing breakdown for a customer product */
export interface CustomerPricingSummary {
  /** Base wholesale cost from vendor */
  wholesaleCost: number;
  /** Decoration/embellishment cost */
  decorationCost: number;
  /** Total cost (wholesale + decoration) */
  totalCost: number;
  /** Retail price after markup */
  retailPrice: number;
  /** Margin information */
  margin: {
    dollars: number;
    percent: number;
  };
  /** Royalty amount per unit */
  royaltyPerUnit: number;
  /** Net revenue after royalty deduction */
  netAfterRoyalty: number;
  /** Optional per-variant pricing breakdown */
  variantPrices?: Record<string, number>;
}

// =============================================================================
// Royalty Types
// =============================================================================

/** A single line item in a royalty report */
export interface RoyaltyLineItem {
  /** Order ID */
  orderId: string;
  /** Human-readable order number */
  orderNumber: string;
  /** ISO-8601 order date */
  orderDate: string;
  /** Product display name */
  productName: string;
  /** Product SKU */
  sku: string;
  /** Color name */
  color: string;
  /** Size label */
  size: string;
  /** Quantity ordered */
  quantity: number;
  /** Unit price charged */
  unitPrice: number;
  /** Royalty rate applied */
  royaltyRate: number;
  /** Royalty per unit */
  royaltyPerUnit: number;
  /** Total royalty for this line */
  royaltyTotal: number;
  /** Whether this line was discounted (zeroed royalty) */
  discounted: boolean;
}

/** Complete royalty report for a customer over a period */
export interface RoyaltyReport {
  /** Customer ID */
  customerId: string;
  /** Customer name */
  customerName: string;
  /** Royalty rate percentage */
  royaltyRate: number;
  /** ISO-8601 period start */
  periodStart: string;
  /** ISO-8601 period end */
  periodEnd: string;
  /** ISO-8601 generation timestamp */
  generatedAt: string;
  /** All line items in the report */
  lineItems: RoyaltyLineItem[];
  /** Total units across all line items */
  totalUnits: number;
  /** Total revenue across all line items */
  totalRevenue: number;
  /** Total royalty owed */
  totalRoyalty: number;
  /** Count of discounted line items */
  discountedLineItems: number;
  /** Number of distinct orders */
  orderCount: number;
}

// =============================================================================
// Input Types
// =============================================================================

/** Input for creating a new customer (auto-generated fields omitted) */
export type CreateCustomerInput = Omit<CustomerAccount, 'id' | 'createdAt' | 'updatedAt'>;

/** Input for updating an existing customer (all fields optional) */
export type UpdateCustomerInput = Partial<CreateCustomerInput>;
