/**
 * Customer Module - Barrel Exports
 *
 * Phase 53: Customer & Royalty System
 */

// Types
export type {
  CustomerAccount,
  CustomerPricingSummary,
  RoyaltyLineItem,
  RoyaltyReport,
  CreateCustomerInput,
  UpdateCustomerInput,
} from './types.js';

// Store operations
export {
  listCustomers,
  getCustomer,
  getCustomerByName,
  addCustomer,
  updateCustomer,
  deleteCustomer,
} from './store.js';

// Pricing functions
export {
  calculateCustomerRetailPrice,
  calculateCustomerVariantPrice,
  calculateCustomerMargin,
  calculateCustomerRoyalty,
  calculateCustomerPricingSummary,
} from './pricing.js';

// Royalty calculation
export {
  matchOrdersToCustomer,
  filterOrdersByDateRange,
  isDiscountedLineItem,
  calculateRoyaltyForLineItem,
  generateRoyaltyReport,
} from './royalty.js';

// Royalty statement PDF
export { generateRoyaltyStatement, setDataDir as setRoyaltyStatementDataDir } from './royalty-statement.js';
